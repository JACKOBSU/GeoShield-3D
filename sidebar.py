from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QPushButton, QLabel, QFileDialog, QSlider, 
    QHBoxLayout, QFrame, QSizePolicy
)
from PySide6.QtCore import Qt, Signal

class SeismicSidebar(QWidget):
    """
    Minimalist, modern sidebar control panel for GeoShield-3D.
    Provides stylized UI controls for file ingestion, parameter tuning,
    analysis triggers, and file exports.
    """
    # Signals for communication with main window
    seismic_loaded = Signal(str)      # Emits file path
    faults_loaded = Signal(str)       # Emits file path
    run_analysis_clicked = Signal()
    export_clicked = Signal()
    threshold_changed = Signal(float)  # Emits new hazard threshold

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedWidth(300)
        self._setup_ui()
        
    def _setup_ui(self):
        # Main layout with tight margins and spacing
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(10, 10, 10, 10)
        main_layout.setSpacing(15)
        
        # Style sheet for dark mode glassmorphism/premium look
        self.setStyleSheet("""
            QWidget {
                background-color: #1e1f22;
                color: #e0e0e0;
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 13px;
            }
            QFrame#card {
                background-color: #2b2d31;
                border: 1px solid #3f4248;
                border-radius: 8px;
                padding: 12px;
            }
            QLabel#title {
                font-size: 18px;
                font-weight: bold;
                color: #4fc3f7; /* Mining cyan highlight */
                margin-bottom: 5px;
            }
            QLabel#subtitle {
                font-size: 11px;
                color: #90a4ae;
                margin-bottom: 10px;
            }
            QLabel#section_header {
                font-size: 12px;
                font-weight: bold;
                color: #b0bec5;
                text-transform: uppercase;
                margin-top: 5px;
                margin-bottom: 5px;
            }
            QPushButton {
                background-color: #35383f;
                border: 1px solid #4f535c;
                border-radius: 6px;
                color: #ffffff;
                padding: 8px 12px;
                font-weight: 600;
            }
            QPushButton:hover {
                background-color: #474b54;
                border-color: #4fc3f7;
            }
            QPushButton:pressed {
                background-color: #2b2d30;
            }
            QPushButton:disabled {
                background-color: #1c1d1f;
                border-color: #2d2e30;
                color: #64748b;
            }
            QPushButton#action_btn {
                background-color: #0288d1;
                border: none;
                color: white;
            }
            QPushButton#action_btn:hover {
                background-color: #039be5;
            }
            QPushButton#action_btn:disabled {
                background-color: #1c2c38;
                color: #4b6584;
            }
            QPushButton#export_btn {
                background-color: #2e7d32;
                border: none;
                color: white;
            }
            QPushButton#export_btn:hover {
                background-color: #388e3c;
            }
            QPushButton#export_btn:disabled {
                background-color: #1b2e20;
                color: #3e5c43;
            }
            QSlider::groove:horizontal {
                height: 4px;
                background: #4f535c;
                border-radius: 2px;
            }
            QSlider::handle:horizontal {
                background: #4fc3f7;
                width: 14px;
                margin-top: -5px;
                margin-bottom: -5px;
                border-radius: 7px;
            }
            QSlider::handle:horizontal:hover {
                background: #81d4fa;
            }
        """)
        
        # Header Info Card
        header_card = QFrame()
        header_card.setObjectName("card")
        header_layout = QVBoxLayout(header_card)
        
        title_label = QLabel("GeoShield-3D")
        title_label.setObjectName("title")
        subtitle_label = QLabel("Microseismic Hazard Mapping Tool")
        subtitle_label.setObjectName("subtitle")
        
        header_layout.addWidget(title_label)
        header_layout.addWidget(subtitle_label)
        main_layout.addWidget(header_card)
        
        # 1. Data Loading Card
        load_card = QFrame()
        load_card.setObjectName("card")
        load_layout = QVBoxLayout(load_card)
        
        load_header = QLabel("1. Data Ingestion")
        load_header.setObjectName("section_header")
        load_layout.addWidget(load_header)
        
        self.btn_load_seismic = QPushButton("Load Seismic CSV")
        self.btn_load_seismic.clicked.connect(self._on_load_seismic)
        load_layout.addWidget(self.btn_load_seismic)
        
        self.lbl_seismic_status = QLabel("No seismic data loaded.")
        self.lbl_seismic_status.setStyleSheet("color: #ff8a80; font-size: 11px;")
        self.lbl_seismic_status.setWordWrap(True)
        load_layout.addWidget(self.lbl_seismic_status)
        
        self.btn_load_faults = QPushButton("Load Faults CSV")
        self.btn_load_faults.clicked.connect(self._on_load_faults)
        load_layout.addWidget(self.btn_load_faults)
        
        self.lbl_faults_status = QLabel("No fault data loaded.")
        self.lbl_faults_status.setStyleSheet("color: #ff8a80; font-size: 11px;")
        self.lbl_faults_status.setWordWrap(True)
        load_layout.addWidget(self.lbl_faults_status)
        
        main_layout.addWidget(load_card)
        
        # 2. Parameters Card
        param_card = QFrame()
        param_card.setObjectName("card")
        param_layout = QVBoxLayout(param_card)
        
        param_header = QLabel("2. Analysis Parameters")
        param_header.setObjectName("section_header")
        param_layout.addWidget(param_header)
        
        # Threshold slider layout
        thresh_info_layout = QHBoxLayout()
        thresh_lbl = QLabel("Hazard Threshold:")
        self.lbl_threshold_val = QLabel("1.5")
        self.lbl_threshold_val.setStyleSheet("font-weight: bold; color: #4fc3f7;")
        thresh_info_layout.addWidget(thresh_lbl)
        thresh_info_layout.addWidget(self.lbl_threshold_val, 0, Qt.AlignRight)
        param_layout.addLayout(thresh_info_layout)
        
        # Slider from 0.1 to 5.0 (mapped as 1 to 50 in QSlider integer steps)
        self.slider_threshold = QSlider(Qt.Horizontal)
        self.slider_threshold.setMinimum(1)
        self.slider_threshold.setMaximum(50)
        self.slider_threshold.setValue(15)  # 1.5 default
        self.slider_threshold.valueChanged.connect(self._on_threshold_changed)
        param_layout.addWidget(self.slider_threshold)
        
        main_layout.addWidget(param_card)
        
        # 3. Execution & Export Card
        exec_card = QFrame()
        exec_card.setObjectName("card")
        exec_layout = QVBoxLayout(exec_card)
        
        exec_header = QLabel("3. Run & Export")
        exec_header.setObjectName("section_header")
        exec_layout.addWidget(exec_header)
        
        self.btn_run = QPushButton("Run Spatial Analysis")
        self.btn_run.setObjectName("action_btn")
        self.btn_run.setEnabled(False)
        self.btn_run.clicked.connect(self.run_analysis_clicked.emit)
        exec_layout.addWidget(self.btn_run)
        
        self.btn_export = QPushButton("Export String File (.str)")
        self.btn_export.setObjectName("export_btn")
        self.btn_export.setEnabled(False)
        self.btn_export.clicked.connect(self.export_clicked.emit)
        exec_layout.addWidget(self.btn_export)
        
        main_layout.addWidget(exec_card)
        
        # Information Console
        info_card = QFrame()
        info_card.setObjectName("card")
        info_card.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.Expanding)
        self.info_layout = QVBoxLayout(info_card)
        
        info_header = QLabel("Status Console")
        info_header.setObjectName("section_header")
        self.info_layout.addWidget(info_header)
        
        self.lbl_console = QLabel("Welcome to GeoShield-3D.\nLoad datasets to begin...")
        self.lbl_console.setStyleSheet("color: #b0bec5; font-size: 11px;")
        self.lbl_console.setWordWrap(True)
        self.lbl_console.setAlignment(Qt.AlignTop | Qt.AlignLeft)
        self.info_layout.addWidget(self.lbl_console)
        
        main_layout.addWidget(info_card)
        
    def _on_load_seismic(self):
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Open Microseismic Log", "", "CSV Files (*.csv);;All Files (*)"
        )
        if file_path:
            self.seismic_loaded.emit(file_path)
            
    def _on_load_faults(self):
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Open Fault Plane Log", "", "CSV Files (*.csv);;All Files (*)"
        )
        if file_path:
            self.faults_loaded.emit(file_path)
            
    def _on_threshold_changed(self, val):
        float_val = val / 10.0
        self.lbl_threshold_val.setText(f"{float_val:.1f}")
        self.threshold_changed.emit(float_val)
        
    def set_seismic_status(self, text: str, success: bool):
        self.lbl_seismic_status.setText(text)
        if success:
            self.lbl_seismic_status.setStyleSheet("color: #81c784; font-size: 11px;")
        else:
            self.lbl_seismic_status.setStyleSheet("color: #ff8a80; font-size: 11px;")
            
    def set_faults_status(self, text: str, success: bool):
        self.lbl_faults_status.setText(text)
        if success:
            self.lbl_faults_status.setStyleSheet("color: #81c784; font-size: 11px;")
        else:
            self.lbl_faults_status.setStyleSheet("color: #ff8a80; font-size: 11px;")
            
    def log(self, message: str):
        """Append log trace into Console."""
        self.lbl_console.setText(message)
