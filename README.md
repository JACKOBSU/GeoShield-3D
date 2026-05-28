# GeoShield-3D

GeoShield-3D is a modular, high-performance Python desktop application designed for mining engineering. It acts as a lightweight companion tool for industry-standard software (such as Surpac and 3DEC) to map microseismic hazard zones relative to geological structures (fault planes).

## Architecture & Features

- **Vectorized Spatial Math**: Implements a high-performance math engine using NumPy broadcasting to calculate the Euclidean distance from $10,000+$ microseismic events to 3D finite fault planes in milliseconds without slow loops.
- **Embedded 3D Viewport**: Uses `pyvistaqt` to embed an interactive, hardware-accelerated VTK canvas directly into a Qt-based desktop UI.
- **Geological Normal Vectors**: Converts geological planar definitions (dip and dip-direction) into 3D disk models aligned correctly in standard mining coordinates ($X$=East, $Y$=North, $Z$=Elevation/Up).
- **Surpac and 3DEC Exports**: Integrates tools to export filtered hazard points directly into Surpac-compatible string format (`.str`) or 3DEC blocks (`.txt`).
- **Strictly Decoupled Design**: Separates the GUI layer, the parsing engine, and the mathematical representation, which simplifies maintenance and enables full unit test coverage.

## Installation

Ensure you have Python 3.11+ installed. Clone or copy the project files to your system, then install the required dependencies:

```bash
pip install -r requirements.txt
```

## How to Run

Launch the GUI by executing:

```bash
python main.py
```

## Running Tests

To run the automated verification suite:

```bash
python -m pytest tests/
```
