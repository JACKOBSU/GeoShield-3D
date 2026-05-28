import pandas as pd
import logging
from models import SeismicData, FaultData, SEISMIC_COLS, FAULT_COLS

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

def _normalize_columns(df: pd.DataFrame, expected_cols: list) -> pd.DataFrame:
    """
    Standardizes column names: trims spaces, converts to lowercase,
    and maps common alternate headers.
    """
    # Clean up column names in DataFrame
    cleaned_cols = {col: col.strip().lower() for col in df.columns}
    df = df.rename(columns=cleaned_cols)
    
    # Check for common alternate spellings/mappings
    mappings = {
        "x_coord": "x", "y_coord": "y", "z_coord": "z", "elevation": "z",
        "mag": "magnitude", "time": "timestamp", "date": "timestamp",
        "fault": "fault_id", "dip_dir": "dip_direction", "rad": "radius"
    }
    
    for alt, standard in mappings.items():
        if standard in expected_cols and standard not in df.columns and alt in df.columns:
            df = df.rename(columns={alt: standard})
            logger.info(f"Mapped column '{alt}' to '{standard}'")
            
    return df

def parse_seismic_csv(file_path: str) -> SeismicData:
    """
    Safely parses a microseismic event log CSV into a validated SeismicData model.
    Throws a descriptive ValueError if formatting fails or columns are missing.
    """
    try:
        logger.info(f"Attempting to read seismic file: {file_path}")
        df = pd.read_csv(file_path)
    except Exception as e:
        raise ValueError(f"Failed to read file as CSV: {str(e)}")
        
    df = _normalize_columns(df, SEISMIC_COLS)
    
    # Check for missing columns
    missing = [col for col in SEISMIC_COLS if col not in df.columns]
    if missing:
        raise ValueError(f"Seismic CSV is missing required columns: {missing}. Found columns: {list(df.columns)}")
        
    # Drop rows where coordinates or magnitude are null
    essential_cols = ["x", "y", "z", "magnitude"]
    initial_len = len(df)
    df = df.dropna(subset=essential_cols)
    dropped = initial_len - len(df)
    if dropped > 0:
        logger.warning(f"Dropped {dropped} rows with missing coordinates or magnitude in seismic CSV.")
        
    if df.empty:
        raise ValueError("Seismic dataset is empty after dropping invalid/missing values.")
        
    # Standardize timestamp format
    try:
        df["timestamp"] = pd.to_datetime(df["timestamp"])
    except Exception as e:
        raise ValueError(f"Failed to parse 'timestamp' column as valid date/time: {str(e)}")
        
    return SeismicData(df[SEISMIC_COLS].copy())

def parse_fault_csv(file_path: str) -> FaultData:
    """
    Safely parses a fault plane log CSV into a validated FaultData model.
    Throws a descriptive ValueError if formatting fails or columns are missing.
    """
    try:
        logger.info(f"Attempting to read fault file: {file_path}")
        df = pd.read_csv(file_path)
    except Exception as e:
        raise ValueError(f"Failed to read file as CSV: {str(e)}")
        
    df = _normalize_columns(df, FAULT_COLS)
    
    # Check for missing columns
    missing = [col for col in FAULT_COLS if col not in df.columns]
    if missing:
        raise ValueError(f"Fault CSV is missing required columns: {missing}. Found columns: {list(df.columns)}")
        
    # Drop rows with null values in coordinates, dip, dip_direction, or radius
    essential_cols = ["x", "y", "z", "dip", "dip_direction", "radius"]
    initial_len = len(df)
    df = df.dropna(subset=essential_cols)
    dropped = initial_len - len(df)
    if dropped > 0:
        logger.warning(f"Dropped {dropped} rows with missing parameters in fault CSV.")
        
    if df.empty:
        raise ValueError("Fault dataset is empty after dropping invalid/missing values.")
        
    # Clean ranges: Dip must be [0, 90], Dip Direction [0, 360], Radius > 0
    df = df[
        (df["dip"] >= 0) & (df["dip"] <= 90) &
        (df["dip_direction"] >= 0) & (df["dip_direction"] <= 360) &
        (df["radius"] > 0)
    ]
    cleaned_len = len(df)
    if cleaned_len == 0:
        raise ValueError("Fault CSV contains no valid fault plane models within valid parameter ranges: "
                         "dip [0,90], dip_direction [0,360], radius > 0.")
    elif cleaned_len < len(df) + dropped:
        logger.warning(f"Filtered out {len(df) + dropped - cleaned_len} out-of-range rows in fault CSV.")
        
    return FaultData(df[FAULT_COLS].copy())
