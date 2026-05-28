import os
import sys
import pandas as pd
import numpy as np
from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
                             QPushButton, QLabel, QSlider, QFileDialog, QFrame, QCheckBox,
                             QTabWidget, QTextBrowser, QMessageBox)
from PySide6.QtCore import Qt, QThread, Signal
from PySide6.QtGui import QPixmap, QIcon
from pyvistaqt import QtInteractor
import pyvista as pv

MODERN_DASHBOARD_STYLE = """
    QMainWindow { background-color: #0d0e12; }
    
    /* Forces the Tab Container and its child pages to adopt the deep dark background */
    QTabWidget::panel {
        border: none;
        background-color: #0d0e12;
    }
    QTabWidget > QWidget {
        background-color: #0d0e12;
    }
    
    QTabBar::tab {
        background-color: #16171d;
        color: #64748b;
        border: 1px solid #23252f;
        border-bottom: none;
        border-top-left-radius: 6px;
        border-top-right-radius: 6px;
        padding: 8px 16px;
        font-family: 'Segoe UI', sans-serif;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-right: 4px;
    }
    QTabBar::tab:selected {
        background-color: #21232d;
        color: #38bdf8;
        border-color: #38bdf8;
    }
    QTabBar::tab:hover {
        color: #e2e8f0;
        background-color: #1c1d24;
    }

    QFrame#card {
        background-color: #16171d;
        border: 1px solid #23252f;
        border-radius: 10px;
        padding: 14px;
        margin-bottom: 12px;
    }
    
    QLabel#brand_title { color: #ffffff; font-family: 'Segoe UI', sans-serif; font-size: 20px; font-weight: 800; }
    QLabel#brand_subtitle { color: #64748b; font-family: 'Segoe UI', sans-serif; font-size: 12px; }
    QLabel#info_label { color: #cbd5e1; font-family: 'Segoe UI', sans-serif; font-size: 12px; }
    QLabel#status_text { color: #38bdf8; font-family: 'Consolas', monospace; font-size: 12px; font-weight: 600; }
    QLabel#danger_counter { color: #f43f5e; font-family: 'Consolas', monospace; font-size: 18px; font-weight: 700; }

    QTextBrowser#document_viewer {
        background-color: #16171d;
        border: 1px solid #23252f;
        border-radius: 10px;
        color: #cbd5e1;
        font-family: 'Segoe UI', sans-serif;
        font-size: 13px;
        line-height: 1.6;
    }

    QPushButton {
        background-color: #21232d; color: #e2e8f0; border: 1px solid #2d313f;
        border-radius: 6px; padding: 8px 14px; font-family: 'Segoe UI', sans-serif; font-size: 12px; font-weight: 600;
    }
    QPushButton:hover { background-color: #2d313f; border-color: #3b4255; }
    QPushButton#run_btn { background-color: #0284c7; color: #ffffff; border: none; }
    QPushButton#run_btn:hover { background-color: #0ea5e9; }
    QPushButton#export_btn { background-color: #16a34a; color: #ffffff; border: none; }
    QPushButton#export_btn:hover { background-color: #22c55e; }
    
    QCheckBox { color: #cbd5e1; font-family: 'Segoe UI', sans-serif; font-size: 12px; spacing: 8px; }
    QCheckBox::indicator { width: 16px; height: 16px; border-radius: 4px; border: 1px solid #3f3f46; background: #21232d; }
    QCheckBox::indicator:checked { background-color: #0ea5e9; border-color: #38bdf8; }

    QSlider::groove:horizontal { border: none; height: 6px; background: #21232d; border-radius: 3px; }
    QSlider::sub-page:horizontal { background: #0ea5e9; border-radius: 3px; }
    QSlider::handle:horizontal { background: #ffffff; border: 2px solid #0ea5e9; width: 14px; height: 14px; margin: -4px 0; border-radius: 7px; }
"""

class CollapsibleCard(QFrame):
    """A custom widget representing an expandable/collapsible geological module panel."""
    def __init__(self, title, start_expanded=False, parent=None):
        super().__init__(parent)
        self.setObjectName("card")
        self.title_text = title

        self.main_layout = QVBoxLayout(self)
        self.main_layout.setContentsMargins(12, 12, 12, 12)
        self.main_layout.setSpacing(0)

        # Header Toggle Component
        self.toggle_button = QPushButton()
        self.toggle_button.setStyleSheet("""
            QPushButton {
                background: transparent;
                color: #94a3b8;
                border: none;
                text-align: left;
                font-family: 'Segoe UI', sans-serif;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1px;
                padding: 0px;
            }
            QPushButton:hover { color: #ffffff; }
        """)
        self.main_layout.addWidget(self.toggle_button)

        # Sub-container Content Frame
        self.content_container = QWidget()
        self.content_layout = QVBoxLayout(self.content_container)
        self.content_layout.setContentsMargins(0, 12, 0, 0)
        self.content_layout.setSpacing(10)
        self.main_layout.addWidget(self.content_container)

        self.toggle_button.clicked.connect(self.handle_toggle)
        self.set_expanded_state(start_expanded)

    def set_expanded_state(self, expanded):
        self.content_container.setVisible(expanded)
        indicator = "▼" if expanded else "▶"
        self.toggle_button.setText(f"{indicator}  {self.title_text}")

    def handle_toggle(self):
        is_currently_visible = self.content_container.isVisible()
        self.set_expanded_state(not is_currently_visible)

    def add_widget(self, widget):
        self.content_layout.addWidget(widget)

    def add_layout(self, layout):
        self.content_layout.addLayout(layout)


class AnalysisWorker(QThread):
    """
    Asynchronous QThread executing geomechanical spatial computations.
    Utilizes parallel vectorized NumPy arrays for lightning-fast calculations.
    """
    finished = Signal(np.ndarray, np.ndarray, np.ndarray, np.ndarray)

    def __init__(self, seismic_df, faults_df):
        super().__init__()
        self.seismic_df = seismic_df
        self.faults_df = faults_df

    def run(self):
        seismic_pts = self.seismic_df[['X', 'Y', 'Z']].values
        magnitudes = self.seismic_df['Magnitude'].values
        fault_centers = self.faults_df[['CenterX', 'CenterY', 'CenterZ']].values
        fault_radii = self.faults_df['Radius'].values
        
        # High-performance parallel broadcasting:
        S = seismic_pts[:, np.newaxis, :]
        C = fault_centers[np.newaxis, :, :]
        R = fault_radii[np.newaxis, :]

        # Optimized spatial Proximity calculations
        dists = np.linalg.norm(S - C, axis=-1) - R
        dists = np.maximum(dists, 0.0)  # Snaps negative distance values to 0.0

        min_dists = np.min(dists, axis=1)
        hazard_indices = 10.0 / (min_dists + 1.0)

        self.finished.emit(seismic_pts, magnitudes, hazard_indices, fault_centers)


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("GeoShield-3D // Professional Analytics Suite")
        self.resize(1380, 860)
        self.setStyleSheet(MODERN_DASHBOARD_STYLE)

        self.seismic_data = None
        self.fault_data = None
        self.seismic_points = None
        self.magnitudes = None
        self.hazard_indices = None

        # Setup OS Window/Taskbar Icon immediately
        logo_path = os.path.join(os.path.dirname(__file__), "geoshield_logo.png")
        if os.path.exists(logo_path):
            self.setWindowIcon(QIcon(logo_path))

        self.init_ui()

    def create_static_card(self):
        card = QFrame()
        card.setObjectName("card")
        layout = QVBoxLayout(card)
        layout.setSpacing(8)
        return card, layout

    def init_ui(self):
        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        main_layout = QHBoxLayout(main_widget)
        main_layout.setContentsMargins(16, 16, 16, 16)
        main_layout.setSpacing(16)

        left_container = QVBoxLayout()
        left_container.setSpacing(0)

        # Integrated Logo + Title Header Layout
        b_card = QFrame(objectName="card")
        b_hbox = QHBoxLayout(b_card)
        b_hbox.setContentsMargins(0, 0, 0, 0)
        b_hbox.setSpacing(12)

        logo_path = os.path.join(os.path.dirname(__file__), "geoshield_logo.png")
        logo_loaded = False
        if os.path.exists(logo_path):
            self.lbl_logo = QLabel()
            self.lbl_logo.setFixedSize(50, 50)
            self.lbl_logo.setPixmap(QPixmap(logo_path).scaled(50, 50, Qt.KeepAspectRatio, Qt.SmoothTransformation))
            b_hbox.addWidget(self.lbl_logo)
            logo_loaded = True

        text_vbox = QVBoxLayout()
        text_vbox.setSpacing(2)
        text_vbox.addWidget(QLabel("GeoShield-3D", objectName="brand_title"))
        text_vbox.addWidget(QLabel("Advanced Spatial Analytics Platform", objectName="brand_subtitle"))
        b_hbox.addLayout(text_vbox)
        b_hbox.addStretch()
        left_container.addWidget(b_card)

        # Tabbed Panel Interface
        self.sidebar_tabs = QTabWidget()
        
        # TAB 1: CONTROL CENTER
        control_pane = QWidget()
        control_pane.setStyleSheet("background-color: #0d0e12;")  # Hardens dark theme base color
        control_layout = QVBoxLayout(control_pane)
        control_layout.setContentsMargins(0, 12, 0, 0)
        control_layout.setSpacing(0)

        # Sub-Panel 1
        self.mod_ingestion = CollapsibleCard("1. Structural Input Ingestion", start_expanded=True)
        self.btn_seismic = QPushButton("Load Seismic CSV")
        self.btn_seismic.clicked.connect(self.load_seismic_file)
        self.lbl_seismic_status = QLabel("No seismic data loaded.", objectName="info_label")
        self.lbl_seismic_status.setStyleSheet("color: #ef4444;")
        self.btn_faults = QPushButton("Load Faults CSV")
        self.btn_faults.clicked.connect(self.load_faults_file)
        self.lbl_faults_status = QLabel("No fault data loaded.", objectName="info_label")
        self.lbl_faults_status.setStyleSheet("color: #ef4444;")
        self.mod_ingestion.add_widget(self.btn_seismic)
        self.mod_ingestion.add_widget(self.lbl_seismic_status)
        self.mod_ingestion.add_widget(self.btn_faults)
        self.mod_ingestion.add_widget(self.lbl_faults_status)
        control_layout.addWidget(self.mod_ingestion)

        # Sub-Panel 2
        self.mod_tuning = CollapsibleCard("2. Spatial Tuning Profiles", start_expanded=False)
        shbox = QHBoxLayout()
        shbox.addWidget(QLabel("Hazard Sensitivity:", objectName="info_label"))
        self.lbl_slider_val = QLabel("1.5", objectName="info_label")
        self.lbl_slider_val.setStyleSheet("color: #0ea5e9; font-weight: bold; font-size: 14px;")
        shbox.addStretch()
        shbox.addWidget(self.lbl_slider_val)
        self.mod_tuning.add_layout(shbox)
        self.slider = QSlider(Qt.Horizontal)
        self.slider.setMinimum(1)
        self.slider.setMaximum(50)
        self.slider.setValue(15)
        self.slider.valueChanged.connect(self.update_slider_label)
        self.mod_tuning.add_widget(self.slider)
        control_layout.addWidget(self.mod_tuning)

        # Sub-Panel 3
        self.mod_visibility = CollapsibleCard("3. Interactive Layer Visibility", start_expanded=False)
        self.chk_show_seismic = QCheckBox("Render Event Cloud Matrix", checked=True)
        self.chk_show_faults = QCheckBox("Display Analytical Fault Disks", checked=True)
        self.chk_show_danger = QCheckBox("Isolate Critical Danger Envelopes", checked=True)
        self.chk_show_seismic.stateChanged.connect(self.update_visualization)
        self.chk_show_faults.stateChanged.connect(self.update_visualization)
        self.chk_show_danger.stateChanged.connect(self.update_visualization)
        self.mod_visibility.add_widget(self.chk_show_seismic)
        self.mod_visibility.add_widget(self.chk_show_faults)
        self.mod_visibility.add_widget(self.chk_show_danger)
        control_layout.addWidget(self.mod_visibility)

        # Sub-Panel 4
        self.mod_execution = CollapsibleCard("4. Compute Execution", start_expanded=False)
        self.btn_run = QPushButton("Run Spatial Analysis", objectName="run_btn")
        self.btn_run.clicked.connect(self.start_analysis)
        self.btn_export = QPushButton("Export Surpac File (.str)", objectName="export_btn")
        self.btn_export.clicked.connect(self.export_string_file)
        self.mod_execution.add_widget(self.btn_run)
        self.mod_execution.add_widget(self.btn_export)
        control_layout.addWidget(self.mod_execution)

        # Permanent Telemetry Card
        c_card, c_box = self.create_static_card()
        self.lbl_counter_desc = QLabel("Critical Risk Nodes Isolated:", objectName="info_label")
        self.lbl_danger_count = QLabel("0 nodes", objectName="danger_counter")
        self.lbl_console = QLabel("Console System ready.", objectName="status_text")
        
        # Report logo loading status inside the console
        if not logo_loaded:
            self.lbl_console.setText("Error: Logo not found.\nPlace geoshield_logo.png in project folder.")
            
        c_box.addWidget(self.lbl_counter_desc)
        c_box.addWidget(self.lbl_danger_count)
        c_box.addWidget(self.lbl_console)
        control_layout.addWidget(c_card)
        control_layout.addStretch()

        # TAB 2: ABOUT
        about_pane = QWidget()
        about_pane.setStyleSheet("background-color: #0d0e12;")
        about_layout = QVBoxLayout(about_pane)
        about_layout.setContentsMargins(0, 12, 0, 0)
        
        about_browser = QTextBrowser(objectName="document_viewer")
        about_html = """
        <div style='padding: 2px;'>
            <h3 style='color: #38bdf8; margin-top: 0px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;'>System Overview</h3>
            <p>GeoShield-3D is an analytical computing environment designed for sub-surface structural hazard mapping and risk mitigation within deep underground excavations. The system specializes in processing high-density microseismic datasets and relating their spatial distribution to defined multi-planar fault geometries.</p>

            <h3 style='color: #38bdf8; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;'>Geomechanical Problem Statement</h3>
            <p>In deep mining systems and civil tunneling infrastructure, structural fault lines are highly prone to sudden slip failures under elevated stress regimes. When excavation occurs, microseismic clustering cascades surrounding these zones. Left unmapped, these accumulation points pose significant hazards, including localized strain bursts or global structural instability. GeoShield-3D isolates spatial microseismic acceleration zones to allow engineers to execute predictive structural stabilization sequences.</p>

            <h3 style='color: #38bdf8; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;'>Mathematical Framework</h3>
            <p>The system executes deterministic proximity mapping via a reciprocal distance attenuation formula. For each individual microseismic coordinate vector, the computational engine resolves the absolute Euclidean minimum distance to any active structural fault margin. The localized hazard distribution index, denoted as H_i, is formulated as follows:</p>
            <p style='font-family: monospace; font-weight: bold; color: #f43f5e; text-align: center; font-size: 14px;'>H_i = 10.0 / (D_min + 1.0)</p>
            <p>Where D_min represents the resolved scalar distance to the nearest multi-planar surface framework. High-density threat envelopes are classified where H_i exceeds user-calibrated threshold criteria.</p>
        </div>
        """
        about_browser.setHtml(about_html)
        about_layout.addWidget(about_browser)

        # TAB 3: HELP
        help_pane = QWidget()
        help_pane.setStyleSheet("background-color: #0d0e12;")
        help_layout = QVBoxLayout(help_pane)
        help_layout.setContentsMargins(0, 12, 0, 0)

        help_browser = QTextBrowser(objectName="document_viewer")
        help_html = """
        <div style='padding: 2px;'>
            <h3 style='color: #38bdf8; margin-top: 0px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;'>Functional Architecture Manual</h3>
            <p>This software environment is partitioned into three distinct top-level tabs. Below is the technical breakdown of the explicit capability and required input workflow for each environment component.</p>

            <h4 style='color: #38bdf8; margin-bottom: 4px; font-size: 13px;'>1. Control Center Tab</h4>
            <p>Serves as the primary operational module for data manipulation, visualization orchestration, and data export. It consists of four distinct collapsible sub-sections:</p>
            <ul>
                <li><b>Structural Input Ingestion:</b> Imports user-defined comma-separated value (.csv) datasets containing spatial coordinate matrices for microseismic points and structural fault center nodes.</li>
                <li><b>Spatial Tuning Profiles:</b> Configures the sensitivity threshold for structural risk evaluation. Modifying this value alters the strictness of the hazard index classification layer.</li>
                <li><b>Interactive Layer Visibility:</b> Manages rendering pipelines within the 3D graphics engine. Allows discrete toggling of the volumetric point cloud matrix, oriented fault plane wireframes, and isolated high-risk nodes.</li>
                <li><b>Compute Execution:</b> Spawns a background multi-threaded worker loop to compute multi-planar distance calculations without blocking the user interface. Also handles vector serialization to external Surpac string (.str) file outputs.</li>
            </ul>

            <h4 style='color: #38bdf8; margin-bottom: 4px; font-size: 13px;'>2. About Tab</h4>
            <p>Houses the theoretical validation, academic background, and geomechanical engineering logic of the application. It clarifies the algorithmic transformations applied to raw geological datasets and outlines the underlying equations governing structural safety indexes.</p>

            <h4 style='color: #38bdf8; margin-bottom: 4px; font-size: 13px;'>3. Help Tab</h4>
            <p>Serves as the centralized technical manual and standard operating procedure guide. It defines tab responsibilities, troubleshooting diagnostics, dataset format constraints, and processing workflow protocols required to run successful spatial structural evaluations.</p>
        </div>
        """
        help_browser.setHtml(help_html)
        help_layout.addWidget(help_browser)

        # Assemble Tabs
        self.sidebar_tabs.addTab(control_pane, "Control Center")
        self.sidebar_tabs.addTab(about_pane, "About")
        self.sidebar_tabs.addTab(help_pane, "Help")
        left_container.addWidget(self.sidebar_tabs)

        sidebar_widget = QWidget()
        sidebar_widget.setLayout(left_container)
        sidebar_widget.setFixedWidth(330)
        main_layout.addWidget(sidebar_widget)

        # 3D View Screen
        self.plotter_widget = QtInteractor(self)
        self.plotter_widget.set_background("#0f1015")
        main_layout.addWidget(self.plotter_widget)

    def update_slider_label(self, val):
        self.lbl_slider_val.setText(f"{val / 10.0:.1f}")
        self.update_visualization()

    def load_seismic_file(self):
        file_path, _ = QFileDialog.getOpenFileName(self, "Open Seismic Data", "", "CSV Files (*.csv)")
        if file_path:
            try:
                df = pd.read_csv(file_path)
                # Case-insensitive column maps
                mapping = {}
                for col in df.columns:
                    c_clean = col.strip().lower()
                    if c_clean == 'x':
                        mapping[col] = 'X'
                    elif c_clean == 'y':
                        mapping[col] = 'Y'
                    elif c_clean == 'z':
                        mapping[col] = 'Z'
                    elif c_clean in ['magnitude', 'mag']:
                        mapping[col] = 'Magnitude'
                
                df = df.rename(columns=mapping)
                required = ['X', 'Y', 'Z', 'Magnitude']
                if not all(col in df.columns for col in required):
                    QMessageBox.warning(self, "Validation Error", f"Seismic file must contain columns: {required}\nFound: {list(df.columns)}")
                    return
                
                self.seismic_data = df
                filename = os.path.basename(file_path)
                self.lbl_seismic_status.setText(f"Loaded: {filename} ({len(self.seismic_data)} seismic rows)")
                self.lbl_seismic_status.setStyleSheet("color: #22c55e;")
                self.lbl_console.setText("Seismic data imported.\nLoad fault data next.")
            except Exception as e:
                QMessageBox.critical(self, "Error Loading File", f"Failed to parse CSV:\n{str(e)}")

    def load_fault_file_path(self, file_path):
        try:
            df = pd.read_csv(file_path)
            # Case-insensitive column maps
            mapping = {}
            for col in df.columns:
                c_clean = col.strip().lower()
                if c_clean == 'centerx':
                    mapping[col] = 'CenterX'
                elif c_clean == 'centery':
                    mapping[col] = 'CenterY'
                elif c_clean == 'centerz':
                    mapping[col] = 'CenterZ'
                elif c_clean == 'radius':
                    mapping[col] = 'Radius'
                elif c_clean == 'normalx':
                    mapping[col] = 'NormalX'
                elif c_clean == 'normaly':
                    mapping[col] = 'NormalY'
                elif c_clean == 'normalz':
                    mapping[col] = 'NormalZ'
            
            df = df.rename(columns=mapping)
            required = ['CenterX', 'CenterY', 'CenterZ', 'Radius', 'NormalX', 'NormalY', 'NormalZ']
            if not all(col in df.columns for col in required):
                QMessageBox.warning(self, "Validation Error", f"Faults file must contain columns: {required}\nFound: {list(df.columns)}")
                return
            
            self.fault_data = df
            filename = os.path.basename(file_path)
            self.lbl_faults_status.setText(f"Loaded: {filename} ({len(self.fault_data)} structures)")
            self.lbl_faults_status.setStyleSheet("color: #22c55e;")
            self.lbl_console.setText("Fault configuration matrix imported.")
        except Exception as e:
            QMessageBox.critical(self, "Error Loading File", f"Failed to parse CSV:\n{str(e)}")

    def load_faults_file(self):
        file_path, _ = QFileDialog.getOpenFileName(self, "Open Faults Data", "", "CSV Files (*.csv)")
        if file_path:
            self.load_fault_file_path(file_path)

    def start_analysis(self):
        if self.seismic_data is None or self.fault_data is None:
            self.lbl_console.setText("Error: Load datasets first.")
            return
        self.lbl_console.setText("Running spatial distance arrays...")
        self.worker = AnalysisWorker(self.seismic_data, self.fault_data)
        self.worker.finished.connect(self.on_analysis_finished)
        self.worker.start()

    def on_analysis_finished(self, seismic_pts, magnitudes, hazard_indices, fault_centers):
        self.seismic_points = seismic_pts
        self.magnitudes = magnitudes
        self.hazard_indices = hazard_indices
        self.lbl_console.setText("Analysis Matrix Completed!")
        self.update_visualization()

    def update_visualization(self):
        if self.seismic_points is None:
            return

        self.plotter_widget.clear()
        threshold = self.slider.value() / 10.0

        custom_scalar_args = {
            'title': 'Hazard Rating', 'vertical': True, 'position_x': 0.04, 'position_y': 0.15,
            'height': 0.6, 'width': 0.04, 'fmt': '%.1f', 'title_font_size': 12, 'label_font_size': 10,
            'color': '#ffffff', 'n_labels': 5
        }

        # Safe guard magnitudes (ensure they remain positive for scaling)
        scaled_mags = np.maximum(self.magnitudes, 0.1)

        # 1. Base Event Mesh Layer (Sized dynamically by real Magnitude!)
        if self.chk_show_seismic.isChecked():
            seismic_cloud = pv.PolyData(self.seismic_points)
            seismic_cloud['Hazard'] = self.hazard_indices
            seismic_cloud['ScaledSize'] = scaled_mags * 12.0  
            glyph_mesh = seismic_cloud.glyph(scale='ScaledSize', geom=pv.Sphere(phi_resolution=6, theta_resolution=6))
            self.plotter_widget.add_mesh(glyph_mesh, cmap='coolwarm', scalar_bar_args=custom_scalar_args, opacity=0.6)

        # 2. Structural Fault Wireframe Disk Layers
        if self.chk_show_faults.isChecked() and self.fault_data is not None:
            for _, row in self.fault_data.iterrows():
                disk = pv.Disc(center=[row['CenterX'], row['CenterY'], row['CenterZ']],
                               inner=0.0, outer=row['Radius'],
                               normal=[row['NormalX'], row['NormalY'], row['NormalZ']], c_res=32)
                self.plotter_widget.add_mesh(disk, color='#64748b', style='wireframe', opacity=0.25)

        # 3. Dedicated High Danger Isolations (Bright Pulsing Red Layer)
        high_risk_mask = self.hazard_indices >= threshold
        danger_count = np.sum(high_risk_mask)
        self.lbl_danger_count.setText(f"{danger_count:,} events")

        if self.chk_show_danger.isChecked() and danger_count > 0:
            danger_points = self.seismic_points[high_risk_mask]
            danger_mags = self.magnitudes[high_risk_mask]
            danger_cloud = pv.PolyData(danger_points)
            danger_cloud['DangerSize'] = danger_mags * 18.0  
            danger_glyphs = danger_cloud.glyph(scale='DangerSize', geom=pv.Sphere(phi_resolution=8, theta_resolution=8))
            self.plotter_widget.add_mesh(danger_glyphs, color='#f43f5e', opacity=0.9, name='danger_layer')

        self.plotter_widget.add_axes()
        self.plotter_widget.reset_camera()

    def export_string_file(self):
        if self.seismic_points is None: return
        file_path, _ = QFileDialog.getSaveFileName(self, "Export Surpac File", "", "String Files (*.str)")
        if file_path:
            high_risk_mask = self.hazard_indices >= (self.slider.value() / 10.0)
            danger_points = self.seismic_points[high_risk_mask]
            with open(file_path, 'w') as f:
                f.write("GeoShield-3D Analytics Export,0,0\n0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0\n")
                for pt in danger_points:
                    f.write(f"100,{pt[0]:.3f},{pt[1]:.3f},{pt[2]:.3f},0,0,0\n")
                f.write("0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0\n")
            self.lbl_console.setText("Surpac File Exported!")

    def closeEvent(self, event):
        # Gracefully release PyVista viewport resources
        self.plotter_widget.close()
        event.accept()
