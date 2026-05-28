import sys
from PySide6.QtWidgets import QApplication
from main_window import MainWindow

def main():
    # Initialize the standard application instance cleanly
    app = QApplication(sys.argv)
    
    # Create and show the GeoShield-3D dashboard
    window = MainWindow()
    window.show()
    
    # Run the application event loop securely
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
