#!/usr/bin/env python3
import struct
import sys
import base64
from PIL import Image
from io import BytesIO

def convert_xcursor_to_svg(input_path, output_path):
    with open(input_path, 'rb') as f:
        data = f.read()
    
    if data[:4] != b'Xcur':
        print(f"Error: {input_path} is not a valid X11 cursor file.")
        sys.exit(1)
        
    header_len, version, toc_len = struct.unpack('<III', data[4:16])
    
    best_image = None
    best_size = 0
    
    # Read TOC
    offset = 16
    for i in range(toc_len):
        chunk_type, chunk_subtype, chunk_pos = struct.unpack('<III', data[offset:offset+12])
        offset += 12
        
        # Image type is 0xfffd0002
        if chunk_type == 0xfffd0002:
            # Parse Image chunk
            c_header_len, c_type, c_subtype, c_version, c_width, c_height, c_xhot, c_yhot, c_delay = struct.unpack('<IIIIIIIII', data[chunk_pos:chunk_pos+36])
            
            pixels_offset = chunk_pos + 36
            pixels_size = c_width * c_height * 4
            pixels = data[pixels_offset:pixels_offset+pixels_size]
            
            # Choose the largest image
            if c_width > best_size:
                best_size = c_width
                best_image = (c_width, c_height, pixels)
                
    if not best_image:
        print("No image found in cursor.")
        sys.exit(1)
        
    width, height, pixels = best_image
    
    # Convert BGRA (pre-multiplied) to RGBA (un-premultiplied)
    img = Image.new('RGBA', (width, height))
    rgba_data = bytearray(width * height * 4)
    for i in range(0, len(pixels), 4):
        b, g, r, a = pixels[i], pixels[i+1], pixels[i+2], pixels[i+3]
        
        if a > 0 and a < 255:
            rgba_data[i] = min(255, (r * 255) // a)
            rgba_data[i+1] = min(255, (g * 255) // a)
            rgba_data[i+2] = min(255, (b * 255) // a)
        else:
            rgba_data[i] = r
            rgba_data[i+1] = g
            rgba_data[i+2] = b
            
        rgba_data[i+3] = a

    img.frombytes(bytes(rgba_data))
    
    buf = BytesIO()
    img.save(buf, format='PNG')
    png_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    
    svg = f'''<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">
  <image href="data:image/png;base64,{png_b64}" width="{width}" height="{height}" />
</svg>'''

    with open(output_path, 'w') as f:
        f.write(svg)
        
    print(f"Successfully converted {input_path} to {output_path}")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python x11_to_svg.py <input_cursor> <output.svg>")
        sys.exit(1)
    convert_xcursor_to_svg(sys.argv[1], sys.argv[2])
