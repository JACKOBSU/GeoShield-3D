import os
# Force pyvistaqt to use PySide6
os.environ["QT_API"] = "pyside6"

import pyvista as pv
from pyvistaqt import QtInteractor
from PySide6.QtWidgets import QWidget, QVBoxLayout
from PySide6.QtCore import QTimer
import numpy as np
import pandas as pd
from math_engine import dip_dip_dir_to_normal

class SeismicCanvas(QWidget):
    """
    3D visualization canvas integrating PyVista within a PySide6 QWidget layout.
    Displays fault planes as finite discs and seismic events as scatter points
    color-coded by hazard index. High-hazard points are visually highlighted
    and feature a premium pulsing warning effect.
    """
    def __init__(self, parent=None):
        super().__init__(parent)
        
        # Main layout
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # Initialize PyVista QtInteractor
        self.plotter = QtInteractor(self)
        layout.addWidget(self.plotter.interactor)
        
        # Configure premium aesthetics
        self.plotter.set_background(color="#141517")  # Deep charcoal grey
        self.plotter.add_axes(color="white")
        self.plotter.enable_anti_aliasing()
        self.plotter.add_camera_orientation_widget()
        
        # Track active actors
        self.fault_actors = []
        self.seismic_actor = None
        self.high_hazard_actor = None
        
        # High hazard flashing effect
        self.flash_timer = QTimer(self)
        self.flash_timer.setInterval(600)  # Pulse every 600ms
        self.flash_timer.timeout.connect(self._toggle_high_hazard_visibility)
        self.flash_state = True
        
    def clear_scene(self):
        """Clears all fault planes and seismic events from the 3D canvas."""
        self.flash_timer.stop()
        self.plotter.clear()
        self.fault_actors = []
        self.seismic_actor = None
        self.high_hazard_actor = None
        
        # Re-add background settings and axes
        self.plotter.set_background(color="#141517")
        self.plotter.add_axes(color="white")
        
    def plot_faults(self, faults_df: pd.DataFrame):
        """
        Renders geological fault planes as finite flat disks using center coordinates,
        dip, dip direction, and radius parameters.
        """
        # Ensure we clean previous faults
        for actor in self.fault_actors:
            self.plotter.remove_actor(actor)
        self.fault_actors = []
        
        if faults_df.empty:
            return
            
        # Compute normal vectors for all rows at once
        dips = faults_df["dip"].to_numpy()
        dip_dirs = faults_df["dip_direction"].to_numpy()
        normals = dip_dip_dir_to_normal(dips, dip_dirs)
        
        for idx, row in faults_df.iterrows():
            fault_id = str(row["fault_id"])
            center = (row["x"], row["y"], row["z"])
            radius = row["radius"]
            normal_vec = normals[idx]
            
            # Create a 3D Disc geometry
            disc_mesh = pv.Disc(
                center=center,
                inner=0.0,
                outer=radius,
                normal=normal_vec,
                c_res=60,
                r_res=2
            )
            
            # Add to plotter with semi-transparency for visibility inside structures
            actor = self.plotter.add_mesh(
                disc_mesh,
                color="#b0bec5",      # Sleek geological silver-grey
                opacity=0.45,
                show_edges=True,
                edge_color="#37474f",
                line_width=1.5,
                name=f"fault_{fault_id}",
                label=f"Fault {fault_id}"
            )
            self.fault_actors.append(actor)
            
        self.plotter.reset_camera()
        
    def plot_seismic_events(self, results_df: pd.DataFrame, high_hazard_threshold: float = 1.5):
        """
        Renders microseismic events as 3D spheres color-coded by their calculated Hazard Index.
        Separates out high-hazard events to render them with a flashing alert state.
        """
        # Stop existing flashing timer
        self.flash_timer.stop()
        
        # Remove previous seismic meshes if present
        if self.seismic_actor:
            self.plotter.remove_actor(self.seismic_actor)
            self.seismic_actor = None
        if self.high_hazard_actor:
            self.plotter.remove_actor(self.high_hazard_actor)
            self.high_hazard_actor = None
            
        if results_df.empty:
            return
            
        # Filter into normal and high hazard points
        high_mask = results_df["hazard_index"] >= high_hazard_threshold
        normal_df = results_df[~high_mask]
        high_df = results_df[high_mask]
        
        # Plot normal/low-hazard events
        if not normal_df.empty:
            pts_normal = normal_df[["x", "y", "z"]].to_numpy()
            poly_normal = pv.PolyData(pts_normal)
            poly_normal["Hazard Index"] = normal_df["hazard_index"].to_numpy()
            
            self.seismic_actor = self.plotter.add_mesh(
                poly_normal,
                scalars="Hazard Index",
                cmap="coolwarm",           # Classic smooth engineering colormap
                point_size=10.0,
                render_points_as_spheres=True,
                clim=[0.0, max(results_df["hazard_index"])], # Consistent color scale
                name="seismic_normal",
                scalar_bar_args={
                    "title": "Hazard Index",
                    "position_x": 0.05,
                    "position_y": 0.15,
                    "height": 0.7,
                    "width": 0.08,
                    "color": "white",
                    "shadow": True,
                    "label_font_size": 12,
                    "title_font_size": 14
                }
            )
            
        # Plot high hazard events with premium larger sizes
        if not high_df.empty:
            pts_high = high_df[["x", "y", "z"]].to_numpy()
            poly_high = pv.PolyData(pts_high)
            
            # Distinct bright pulsing red color
            self.high_hazard_actor = self.plotter.add_mesh(
                poly_high,
                color="#ff1744",          # Vivid neon crimson red
                point_size=16.0,
                render_points_as_spheres=True,
                name="seismic_high_hazard",
                opacity=1.0
            )
            
            # Start the flashing animation
            self.flash_state = True
            self.flash_timer.start()
            
        self.plotter.reset_camera()
        
    def _toggle_high_hazard_visibility(self):
        """Timer callback that creates the pulsing/flashing alarm effect."""
        if self.high_hazard_actor:
            self.flash_state = not self.flash_state
            self.high_hazard_actor.SetVisibility(self.flash_state)
            self.plotter.update()
            
    def closeEvent(self, event):
        """Clean closure to properly free native VTK plotting handles."""
        self.flash_timer.stop()
        self.plotter.close()
        event.accept()
