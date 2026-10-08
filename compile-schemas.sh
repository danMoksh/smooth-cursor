#!/bin/bash
# Compile GSettings schema for cursor-spark extension

# Navigate to the schemas directory
cd "$(dirname "$0")/schemas"

# Compile the schema
glib-compile-schemas .

echo "Schema compiled successfully!"
