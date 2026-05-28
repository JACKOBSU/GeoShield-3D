import os
from PySide6.QtWidgets import (
    QMainWindow, QWidget, QHBoxLayout, QSplitter, QMessageBox, QFileDialog
)
from PySide6.QtCore import Qt, QThread, Signal
import logging

from gui.sidebar import SeismicSidebar
from gui.canvas import SeismicCanvas
from gui.exporter import export_high_hazard_points
from core.parser import parse_seismic_csv, parse_fault_csv
from core.models import SeismicData, FaultData, AnalysisResult

logger = logging.getLogger(__name__)

class AnalysisThread(QThread):
    """
    QThread worker to execute the vectorized 3D spatial calculations
    without blocking or freezing the main PySide6 UI thread.
    """
    finished = Signal(object, str)  # Emits (AnalysisResult, error_message)

    def __init__(self, seismic: SeismicData, faults: FaultData):
        super().__init__()
        self.seismic = seismic
        self.faults = faults

    def run(self):
        try:
            from core.math_engine import calculate_hazard
            result = calculate_hazard(self.seismic, self.faults)
            self.finished.emit(result, "")
        except Exception as e:
            self.finished.emit(None, str(e))


class GeoShieldMainWindow(QMainWindow):
    """
    Main Application Window for GeoShield-3D.
    Orchestrates UI components (Sidebar & Canvas) and links user interaction
    to threaded mathematical processes and file exports.
    """
    def __init__(self):
        super().__init__()
        self.setWindowTitle("GeoShield-3D // Geological Hazard Mapping")
        self.resize(1200, 800)
        
        # State variables
        self.seismic_data = None
        self.fault_data = None
        self.analysis_result = None
        self.hazard_threshold = 1.5
        
        self._setup_ui()
        
    def _setup_ui(self):
        # Central widget and horizontal splitter to allow user resizing of panels
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        layout = QHBoxLayout(central_widget)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        
        splitter = QSplitter(Qt.Horizontal)
        splitter.setStyleSheet("QSplitter::handle { background-color: #2b2d31; width: 4px; }")
        
        # Create Sidebar
        self.sidebar = SeismicSidebar()
        splitter.addWidget(self.sidebar)
        
        # Create 3D PyVista Canvas
        self.canvas = SeismicCanvas()
        splitter.addWidget(self.canvas)
        
        # Adjust splitter sizes (300px sidebar, remainder to 3D canvas)
        splitter.setSizes([300, 900])
        layout.addWidget(splitter)
        
        # Wire up custom signals
        self.sidebar.seismic_loaded.connect(self._on_seismic_loaded)
        self.sidebar.faults_loaded.connect(self._on_faults_loaded)
        self.sidebar.run_analysis_clicked.connect(self._on_run_analysis)
        self.sidebar.export_clicked.connect(self._on_export_data)
        self.sidebar.threshold_changed.connect(self._on_threshold_changed)
        
    def _on_seismic_loaded(self, file_path: str):
        try:
            self.sidebar.log("Parsing microseismic CSV...")
            self.seismic_data = parse_seismic_csv(file_path)
            
            count = len(self.seismic_data.df)
            file_name = os.path.basename(file_path)
            self.sidebar.set_seismic_status(f"Loaded: {file_name} ({count} events)", True)
            self.sidebar.log(f"Seismic Log successfully loaded:\n{count} events detected.\nReady for fault mapping.")
            
            self._update_run_button_state()
            
        except Exception as e:
            self.sidebar.set_seismic_status("Error loading file.", False)
            QMessageBox.critical(self, "Seismic Ingestion Error", f"Failed to load seismic log:\n{str(e)}")
            
    def _on_faults_loaded(self, file_path: str):
        try:
            self.sidebar.log("Parsing geological fault CSV...")
            self.fault_data = parse_fault_csv(file_path)
            
            count = len(self.fault_data.df)
            file_name = os.path.basename(file_path)
            self.sidebar.set_faults_status(f"Loaded: {file_name} ({count} faults)", True)
            
            # Immediately plot fault structures onto canvas
            self.sidebar.log(f"Fault Log successfully loaded:\n{count} geological structures parsed.\nRendering fault disks...")
            self.canvas.plot_faults(self.fault_data.df)
            
            self._update_run_button_state()
            
        except Exception as e:
            self.sidebar.set_faults_status("Error loading file.", False)
            QMessageBox.critical(self, "Fault Ingestion Error", f"Failed to load fault plane log:\n{str(e)}")
            
    def _update_run_button_state(self):
        """Enables the run analysis button only if both datasets are successfully loaded."""
        ready = (self.seismic_data is not None) and (self.fault_data is not None)
        self.sidebar.btn_run.setEnabled(ready)
        
    def _on_run_analysis(self):
        if not self.seismic_data or not self.fault_data:
            return
            
        self.sidebar.log("Running spatial hazard calculations in thread...")
        self.sidebar.btn_run.setEnabled(False)
        self.sidebar.btn_load_seismic.setEnabled(False)
        self.sidebar.btn_load_faults.setEnabled(False)
        
        # Launch calculations in thread
        self.worker = AnalysisWorkerThread = AnalysisThread(self.seismic_data, self.fault_data)
        AnalysisWorkerThread.finished.connect(self._on_analysis_finished)
        AnalysisWorkerThread.start()
        
    def _on_analysis_finished(self, result: AnalysisResult, err_msg: str):
        # Re-enable ingestion controls
        self.sidebar.btn_load_seismic.setEnabled(True)
        self.sidebar.btn_load_faults.setEnabled(True)
        self.sidebar.btn_run.setEnabled(True)
        
        if err_msg:
            QMessageBox.critical(self, "Calculation Error", f"Seismic hazard calculation failed:\n{err_msg}")
            self.sidebar.log(f"Error during execution:\n{err_msg}")
            return
            
        self.analysis_result = result
        
        # Calculate stats for the sidebar logs
        df = result.df
        min_h = df["hazard_index"].min()
        max_h = df["hazard_index"].max()
        avg_dist = df["distance_to_fault"].mean()
        high_hazard_count = len(df[df["hazard_index"] >= self.hazard_threshold])
        
        console_txt = (
            f"Analysis Completed!\n\n"
            f"Total events analyzed: {len(df)}\n"
            f"Mean distance to fault: {avg_dist:.2f} m\n"
            f"Hazard Index Range:\n"
            f"  - Min: {min_h:.3f}\n"
            f"  - Max: {max_h:.3f}\n\n"
            f"High Hazard Events (>= {self.hazard_threshold}): {high_hazard_count}\n"
            f"Rendering events..."
        )
        self.sidebar.log(console_txt)
        
        # Plot coordinates onto PyVista viewport
        self.canvas.plot_seismic_events(df, self.hazard_threshold)
        
        # Enable exporting
        self.sidebar.btn_export.setEnabled(True)
        
    def _on_threshold_changed(self, threshold: float):
        self.hazard_threshold = threshold
        
        # If we have existing calculations, update the plotting threshold dynamically
        if self.analysis_result is not None:
            df = self.analysis_result.df
            high_hazard_count = len(df[df["hazard_index"] >= self.hazard_threshold])
            self.canvas.plot_seismic_events(df, self.hazard_threshold)
            
            # Update log
            min_h = df["hazard_index"].min()
            max_h = df["hazard_index"].max()
            avg_dist = df["distance_to_fault"].mean()
            console_txt = (
                f"Threshold Updated to {self.hazard_threshold:.1f}\n\n"
                f"Total events analyzed: {len(df)}\n"
                f"Mean distance to fault: {avg_dist:.2f} m\n"
                f"Hazard Index Range:\n"
                f"  - Min: {min_h:.3f}\n"
                f"  - Max: {max_h:.3f}\n\n"
                f"High Hazard Events (>= {self.hazard_threshold}): {high_hazard_count}"
            )
            self.sidebar.log(console_txt)
            
    def _on_export_data(self):
        if self.analysis_result is None:
            return
            
        file_path, selected_filter = QFileDialog.getSaveFileName(
            self,
            "Export High Hazard Coordinate Data",
            "",
            "Surpac String (*.str);;3DEC Coordinates (*.txt);;All Files (*)"
        )
        
        if not file_path:
            return
            
        # Enforce extension matching filter selection if user omitted it
        if "Surpac" in selected_filter and not file_path.lower().endswith(".str"):
            file_path += ".str"
        elif "3DEC" in selected_filter and not file_path.lower().endswith(".txt"):
            file_path += ".txt"
            
        try:
            count = export_high_hazard_points(file_path, self.analysis_result.df, self.hazard_threshold)
            if count > 0:
                QMessageBox.information(
                    self,
                    "Export Successful",
                    f"Successfully exported {count} high-hazard coordinates to:\n{file_path}"
                )
                self.sidebar.log(f"Export Completed!\nFile: {os.path.basename(file_path)}\nPoints: {count}")
            else:
                QMessageBox.warning(
                    self,
                    "Export Omitted",
                    f"No events met the active Hazard Index threshold of {self.hazard_threshold:.1f}. File was not written."
                )
        except Exception as e:
            QMessageBox.critical(self, "Export Failed", f"An error occurred during file export:\n{str(e)}")
            
    def closeEvent(self, event):
        # Delegate close sequence to PyVista viewport resources
        self.canvas.closeEvent(event)
