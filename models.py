from dataclasses import dataclass
import pandas as pd

# Define column name constants to prevent string typo errors
SEISMIC_COLS = ["timestamp", "x", "y", "z", "magnitude"]
FAULT_COLS = ["fault_id", "x", "y", "z", "dip", "dip_direction", "radius"]
RESULT_COLS = ["timestamp", "x", "y", "z", "magnitude", "distance_to_fault", "nearest_fault_id", "hazard_index"]

@dataclass(frozen=True)
class SeismicData:
    """Container class for loaded and validated microseismic events."""
    df: pd.DataFrame
    
    def __post_init__(self):
        # Validate that required columns exist
        for col in SEISMIC_COLS:
            if col not in self.df.columns:
                raise ValueError(f"Missing required seismic column: '{col}'")
        
        # Ensure correct data types
        self.df["x"] = self.df["x"].astype(float)
        self.df["y"] = self.df["y"].astype(float)
        self.df["z"] = self.df["z"].astype(float)
        self.df["magnitude"] = self.df["magnitude"].astype(float)

@dataclass(frozen=True)
class FaultData:
    """Container class for loaded and validated geological fault plane structures."""
    df: pd.DataFrame
    
    def __post_init__(self):
        # Validate that required columns exist
        for col in FAULT_COLS:
            if col not in self.df.columns:
                raise ValueError(f"Missing required fault column: '{col}'")
        
        # Ensure correct data types
        self.df["fault_id"] = self.df["fault_id"].astype(str)
        self.df["x"] = self.df["x"].astype(float)
        self.df["y"] = self.df["y"].astype(float)
        self.df["z"] = self.df["z"].astype(float)
        self.df["dip"] = self.df["dip"].astype(float)
        self.df["dip_direction"] = self.df["dip_direction"].astype(float)
        self.df["radius"] = self.df["radius"].astype(float)

@dataclass(frozen=True)
class AnalysisResult:
    """Container class for final calculated hazard analysis results."""
    df: pd.DataFrame
    
    def __post_init__(self):
        for col in RESULT_COLS:
            if col not in self.df.columns:
                raise ValueError(f"Missing required analysis result column: '{col}'")
