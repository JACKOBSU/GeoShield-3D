import numpy as np
import pandas as pd
from typing import Tuple
from models import SeismicData, FaultData, AnalysisResult

def dip_dip_dir_to_normal(dip_deg: np.ndarray, dip_dir_deg: np.ndarray) -> np.ndarray:
    """
    Converts fault plane dip and dip direction angles in degrees to 3D unit normal vectors.
    Assumes standard mining Cartesian coordinates: X = East, Y = North, Z = Elevation (Up).
    
    Parameters:
    - dip_deg: Dip angle in degrees (0 to 90)
    - dip_dir_deg: Dip direction azimuth in degrees (0 to 360)
    
    Returns:
    - Normal vector array of shape (M, 3)
    """
    dip_rad = np.radians(dip_deg)
    dip_dir_rad = np.radians(dip_dir_deg)
    
    nx = np.sin(dip_dir_rad) * np.sin(dip_rad)
    ny = np.cos(dip_dir_rad) * np.sin(dip_rad)
    nz = np.cos(dip_rad)
    
    return np.stack([nx, ny, nz], axis=-1)

def compute_distances_to_disks(
    points: np.ndarray,
    centers: np.ndarray,
    normals: np.ndarray,
    radii: np.ndarray
) -> np.ndarray:
    """
    Calculates the shortest Euclidean distance from N 3D points to M finite circular disks.
    This utilizes vectorized operations and NumPy broadcasting for maximum performance.
    
    Parameters:
    - points: coordinates of shape (N, 3)
    - centers: disk centers of shape (M, 3)
    - normals: disk unit normals of shape (M, 3)
    - radii: disk radii of shape (M,)
    
    Returns:
    - A 2D distance matrix of shape (N, M) containing distance from point i to disk j.
    """
    # Expand shapes for broadcasting:
    P = points[:, np.newaxis, :]
    C = centers[np.newaxis, :, :]
    N_arr = normals[np.newaxis, :, :]
    R = radii[np.newaxis, :]
    
    # 1. Vector from disk center to point
    D = P - C  # Shape: (N, M, 3)
    
    # 2. Signed distance from point to plane containing the disk
    d_plane = np.sum(D * N_arr, axis=-1)  # Shape: (N, M)
    
    # 3. Projection of point onto the disk's plane
    P_proj = P - d_plane[:, :, np.newaxis] * N_arr  # Shape: (N, M, 3)
    
    # 4. Vector from disk center to projection on the plane
    V_proj = P_proj - C  # Shape: (N, M, 3)
    d_center = np.linalg.norm(V_proj, axis=-1)  # Shape: (N, M)
    
    # 5. Handle closest point on the disk boundary or disk surface
    # Avoid division by zero:
    safe_d_center = np.where(d_center > 0, d_center, 1.0)
    factor = np.where(d_center > R, R / safe_d_center, 1.0)
    
    # 6. Coordinates of the closest point Q on the disk
    Q = C + factor[:, :, np.newaxis] * V_proj  # Shape: (N, M, 3)
    
    # 7. Distance from point to Q
    distances = np.linalg.norm(P - Q, axis=-1)  # Shape: (N, M)
    return distances

def calculate_hazard(seismic: SeismicData, faults: FaultData) -> AnalysisResult:
    """
    Main spatial math engine that computes hazard indexes relative to geological fault structures.
    For every seismic event, it calculates the distance to the nearest fault disk surface
    and computes Hazard Index: H = Magnitude / (Distance + 1).
    
    Returns:
    - An AnalysisResult wrapping the original event logs enriched with 'distance_to_fault',
      'nearest_fault_id', and 'hazard_index'.
    """
    # Extract coordinates
    pts = seismic.df[["x", "y", "z"]].to_numpy()
    centers = faults.df[["x", "y", "z"]].to_numpy()
    radii = faults.df["radius"].to_numpy()
    
    # Compute normal vectors for all fault planes
    normals = dip_dip_dir_to_normal(faults.df["dip"].to_numpy(), faults.df["dip_direction"].to_numpy())
    
    # Compute full distance matrix (N, M)
    dist_matrix = compute_distances_to_disks(pts, centers, normals, radii)
    
    # Get index of nearest fault and corresponding distance for each seismic event
    nearest_fault_indices = np.argmin(dist_matrix, axis=1)
    min_distances = np.min(dist_matrix, axis=1)
    
    # Retrieve fault IDs
    fault_ids = faults.df["fault_id"].to_numpy()
    nearest_fault_ids = fault_ids[nearest_fault_indices]
    
    # Build enriched dataframe
    res_df = seismic.df.copy()
    res_df["distance_to_fault"] = min_distances
    res_df["nearest_fault_id"] = nearest_fault_ids
    
    # Hazard calculation: H = Magnitude / (Distance + 1)
    res_df["hazard_index"] = res_df["magnitude"] / (min_distances + 1.0)
    
    return AnalysisResult(res_df)
