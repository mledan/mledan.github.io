#!/usr/bin/env python3
"""Validate Azure Function structure before deployment."""

import json
import os
import sys

def validate_function_structure(base_path):
    """Validate the Azure Function app structure."""
    errors = []
    
    # Check host.json
    host_json_path = os.path.join(base_path, "host.json")
    if not os.path.exists(host_json_path):
        errors.append("Missing host.json file")
    else:
        try:
            with open(host_json_path, 'r') as f:
                host_config = json.load(f)
                print(f"✓ host.json found and valid: version {host_config.get('version', 'unknown')}")
        except json.JSONDecodeError as e:
            errors.append(f"Invalid host.json: {e}")
    
    # Check requirements.txt
    requirements_path = os.path.join(base_path, "requirements.txt")
    if not os.path.exists(requirements_path):
        errors.append("Missing requirements.txt file")
    else:
        print("✓ requirements.txt found")
    
    # Find and validate function folders
    function_count = 0
    for item in os.listdir(base_path):
        item_path = os.path.join(base_path, item)
        if os.path.isdir(item_path):
            function_json_path = os.path.join(item_path, "function.json")
            if os.path.exists(function_json_path):
                function_count += 1
                try:
                    with open(function_json_path, 'r') as f:
                        func_config = json.load(f)
                        print(f"✓ Function '{item}' found with {len(func_config.get('bindings', []))} bindings")
                        
                        # Check for __init__.py
                        init_path = os.path.join(item_path, "__init__.py")
                        if not os.path.exists(init_path):
                            errors.append(f"Function '{item}' missing __init__.py")
                except json.JSONDecodeError as e:
                    errors.append(f"Invalid function.json in '{item}': {e}")
    
    if function_count == 0:
        errors.append("No functions found")
    
    # Check for common issues
    pycache_exists = any("__pycache__" in root for root, dirs, files in os.walk(base_path))
    if pycache_exists:
        print("⚠ Warning: __pycache__ directories found (should be excluded from deployment)")
    
    return errors

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "./back"
    print(f"Validating Azure Function structure in: {path}\n")
    
    errors = validate_function_structure(path)
    
    if errors:
        print("\n❌ Validation failed with errors:")
        for error in errors:
            print(f"  - {error}")
        sys.exit(1)
    else:
        print("\n✅ All validations passed!")
        sys.exit(0)