import os
import numpy as np
import pandas as pd

def generate_synthetic_mining_data():
    """
    Generates realistic synthetic microseismic and fault log datasets matching the 
    exact GeoShield-3D flat dashboard schemas.
    Saves CSV files to data/ folder.
    """
    os.makedirs("data", exist_ok=True)
    
    # 1. Define 5 Fault Planes using user's schemas:
    # CenterX, CenterY, CenterZ, Radius, NormalX, NormalY, NormalZ
    faults = [
        # North-dipping fault
        {"CenterX": 500.0, "CenterY": 750.0, "CenterZ": 250.0, "Radius": 250.0, "NormalX": 0.0, "NormalY": 0.94, "NormalZ": 0.34},
        # South-dipping fault
        {"CenterX": 500.0, "CenterY": 250.0, "CenterZ": 150.0, "Radius": 200.0, "NormalX": 0.0, "NormalY": -0.707, "NormalZ": 0.707},
        # East-dipping fault
        {"CenterX": 800.0, "CenterY": 500.0, "CenterZ": 300.0, "Radius": 180.0, "NormalX": 0.866, "NormalY": 0.0, "NormalZ": 0.5},
        # West-dipping fault
        {"CenterX": 200.0, "CenterY": 500.0, "CenterZ": 200.0, "Radius": 150.0, "NormalX": -0.996, "NormalY": 0.0, "NormalZ": 0.087},
        # Shallow shear zone fault
        {"CenterX": 500.0, "CenterY": 500.0, "CenterZ": 350.0, "Radius": 300.0, "NormalX": 0.18, "NormalY": 0.18, "NormalZ": 0.96},
    ]
    
    faults_df = pd.DataFrame(faults)
    faults_df.to_csv("data/sample_faults.csv", index=False)
    print("Generated 5 faults: data/sample_faults.csv")
    
    # 2. Generate 10,000 Seismic Events with columns: X, Y, Z
    n_events = 10000
    np.random.seed(42)
    
    # Generate background uniform regional events (20%)
    bg_count = int(n_events * 0.20)
    bg_x = np.random.uniform(50.0, 950.0, bg_count)
    bg_y = np.random.uniform(50.0, 950.0, bg_count)
    bg_z = np.random.uniform(20.0, 480.0, bg_count)
    
    # Generate clustered microseismic events near faults (80%)
    cluster_count = n_events - bg_count
    cl_x = []
    cl_y = []
    cl_z = []
    events_per_fault = cluster_count // len(faults)
    
    for f in faults:
        r = np.random.uniform(0, f["Radius"] * 0.8, events_per_fault)
        theta = np.random.uniform(0, 2 * np.pi, events_per_fault)
        
        dx = r * np.sin(theta)
        dy = r * np.cos(theta)
        
        # Local normal vector
        normal = np.array([f["NormalX"], f["NormalY"], f["NormalZ"]])
        
        # Define arbitrary horizontal vector in the plane
        if abs(normal[0]) < 0.9:
            strike = np.array([1.0, 0.0, -normal[0]/normal[2] if normal[2] != 0 else 0])
        else:
            strike = np.array([0.0, 1.0, -normal[1]/normal[2] if normal[2] != 0 else 0])
        strike /= np.linalg.norm(strike)
        
        # Dip vector in the plane (orthogonal to strike and normal)
        dip_vec = np.cross(normal, strike)
        
        # Build 3D coordinates clustered along the plane disk
        pts_local = dx[:, np.newaxis] * strike + dy[:, np.newaxis] * dip_vec
        
        # Damage zone dispersion (events occur in fracture zones around the fault plane)
        dispersion = np.random.normal(0, 15.0, events_per_fault)
        pts_damage = pts_local + dispersion[:, np.newaxis] * normal
        
        cl_x.append(f["CenterX"] + pts_damage[:, 0])
        cl_y.append(f["CenterY"] + pts_damage[:, 1])
        cl_z.append(f["CenterZ"] + pts_damage[:, 2])
        
    x = np.concatenate([bg_x, np.concatenate(cl_x)])
    y = np.concatenate([bg_y, np.concatenate(cl_y)])
    z = np.concatenate([bg_z, np.concatenate(cl_z)])
    
    # Clip coordinates to reasonable mining block boundaries
    x = np.clip(x, 0.0, 1000.0)
    y = np.clip(y, 0.0, 1000.0)
    z = np.clip(z, 0.0, 500.0)
    
    seismic_df = pd.DataFrame({
        "X": np.round(x, 2),
        "Y": np.round(y, 2),
        "Z": np.round(z, 2)
    })
    
    seismic_df.to_csv("data/sample_seismic.csv", index=False)
    print(f"Generated {n_events} seismic events: data/sample_seismic.csv")

if __name__ == "__main__":
    generate_synthetic_mining_data()
