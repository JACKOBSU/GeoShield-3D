import os
import pandas as pd
import logging

logger = logging.getLogger(__name__)

def export_high_hazard_points(
    file_path: str,
    results_df: pd.DataFrame,
    threshold: float
) -> int:
    """
    Exports high-hazard microseismic events to either a Surpac-compatible string file (.str)
    or a 3DEC-compatible block text file (.txt).
    
    Parameters:
    - file_path: Target absolute output file path.
    - results_df: AnalysisResult DataFrame containing columns ['x', 'y', 'z', 'magnitude', 'hazard_index']
    - threshold: Hazard Index cutoff value. Only events with hazard_index >= threshold are exported.
    
    Returns:
    - The number of exported points.
    """
    # Filter high-hazard events
    high_hazard_df = results_df[results_df["hazard_index"] >= threshold]
    count = len(high_hazard_df)
    
    if count == 0:
        logger.warning(f"No events found with Hazard Index >= {threshold}. Nothing to export.")
        return 0
        
    _, ext = os.path.splitext(file_path.lower())
    
    try:
        if ext == ".str":
            # Surpac String format: space-delimited
            with open(file_path, "w") as f:
                f.write("GeoShield-3D High Hazard Export\n")
                f.write("0, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000\n")  # System record
                
                for _, row in high_hazard_df.iterrows():
                    f.write(f"99 {row['y']:.3f} {row['x']:.3f} {row['z']:.3f} {row['hazard_index']:.4f}\n")
                
                # End of file marker
                f.write("0, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000\n")
                
            logger.info(f"Successfully exported {count} points to Surpac .str format: {file_path}")
            
        else:
            # 3DEC Block Coordinates format: space-delimited X Y Z Attribute
            with open(file_path, "w") as f:
                # Direct block point format
                for _, row in high_hazard_df.iterrows():
                    f.write(f"{row['x']:.3f} {row['y']:.3f} {row['z']:.3f} {row['hazard_index']:.4f}\n")
                    
            logger.info(f"Successfully exported {count} points to 3DEC .txt format: {file_path}")
            
        return count
        
    except Exception as e:
        logger.error(f"Failed to export file: {str(e)}")
        raise ValueError(f"Failed to write to file: {str(e)}")
