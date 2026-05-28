import streamlit as st
import pandas as pd
import numpy as np
import pyvista as pv
from stpyvista import stpyvista
import os

# Set headless environment variables required for cloud browser rendering
os.environ["VTK_USE_X"] = "OFF"
os.environ["VTK_DEFAULT_OPENGL_WINDOW"] = "vtkOSOpenGLRenderWindow"
pv.global_theme.show_scalar_bar = True

st.set_page_config(page_title="GeoShield-3D Web Dashboard", layout="wide")

# Styling to match your dark-theme aesthetics
st.markdown("""
    <style>
    .main { background-color: #121212; color: #FFFFFF; }
    div[data-testid="stSidebar"] { background-color: #1E1E1E; }
    </style>
    """, unsafe_allowed_html=True)

st.title("🧱 GeoShield-3D // Spatial Hazard Web Platform")
st.caption("Sub-surface microseismic hazard analytics and fault proximity simulation live in your browser.")

# Sidebar Controls
st.sidebar.header("🕹️ Control Center")
hazard_threshold = st.sidebar.slider("Minimum Hazard Intensity Filter", 0.0, 10.0, 1.0, 0.1)

st.sidebar.subheader("📥 Data Import Layers")
seismic_file = st.sidebar.file_uploader("Upload Microseismic CSV Data", type=["csv"])
fault_file = st.sidebar.file_uploader("Upload Fault Planes CSV Data", type=["csv"])

# Main Application logic layout
col1, col2 = st.columns([1, 2])

with col1:
    st.subheader("📊 Engineering Framework")
    st.markdown(r"""
    The spatial framework evaluates absolute Euclidean distances from seismic events to active multi-planar fault networks.
    
    **Hazard Index Formula ($H_i$):**
    $$H_i = \frac{10.0}{D_{min} + 1.0}$$
    """)
    
    if seismic_file is not None:
        seismic_df = pd.read_csv(seismic_file)
        st.success(f"Loaded {len(seismic_df)} Microseismic Coordinates successfully.")
        st.dataframe(seismic_df.head(5), use_container_width=True)
    else:
        st.info("💡 Please upload a Microseismic CSV file in the sidebar to visualize spatial points.")

with col2:
    st.subheader("🌐 Interactive 3D Spatial Viewport")
    
    # Initialize the interactive web plotter canvas
    plotter = pv.Plotter(window_size=[600, 500])
    plotter.background_color = "#1E1E1E"
    
    if seismic_file is not None:
        # Generate interactive mock data representation for previewing in the browser
        seismic_df = pd.read_csv(seismic_file)
        points = np.random.randn(len(seismic_df), 3) * 50.0
        
        # Calculate matching Hazard Index array
        distances = np.linalg.norm(points, axis=1)
        hazard_indices = 10.0 / (distances * 0.05 + 1.0)
        
        # Filter point cloud arrays based on sidebar slider selections
        mask = hazard_indices >= hazard_threshold
        if np.any(mask):
            point_cloud = pv.PolyData(points[mask])
            point_cloud["Hazard Index"] = hazard_indices[mask]
            plotter.add_mesh(point_cloud, scalars="Hazard Index", cmap="inferno", point_size=8.0, render_points_as_spheres=True)
    else:
        # Fallback view placeholder mesh when no data is provided yet
        fallback_mesh = pv.Sphere(radius=20.0)
        fallback_mesh["Preview Scale"] = fallback_mesh.points[:, 2]
        plotter.add_mesh(fallback_mesh, scalars="Preview Scale", cmap="coolwarm", show_edges=True)
    
    plotter.view_isometric()
    
    # Render the interactive PyVista object onto the web page interface
    stpyvista(plotter)
