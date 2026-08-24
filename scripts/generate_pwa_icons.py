import os
from PIL import Image

def generate_icons():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    public_dir = os.path.join(base_dir, 'frontend', 'public')
    logo_path = os.path.join(public_dir, 'logo.png')

    if not os.path.exists(logo_path):
        print(f"Error: {logo_path} not found")
        return

    # Open original logo
    orig = Image.open(logo_path).convert("RGBA")
    w, h = orig.size

    def create_square_icon(size, bg_color=None, padding_ratio=0.08):
        # Create base image
        if bg_color:
            canvas = Image.new("RGBA", (size, size), bg_color)
        else:
            canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))

        # Target size with padding
        avail_size = int(size * (1 - 2 * padding_ratio))
        ratio = min(avail_size / w, avail_size / h)
        new_w = int(w * ratio)
        new_h = int(h * ratio)

        resized = orig.resize((new_w, new_h), Image.Resampling.LANCZOS)
        offset_x = (size - new_w) // 2
        offset_y = (size - new_h) // 2

        canvas.paste(resized, (offset_x, offset_y), resized)
        return canvas

    # 1. Generate transparent square icons
    for sz in [16, 32, 48, 64, 128, 180, 192, 256, 384, 512]:
        img = create_square_icon(sz, bg_color=None, padding_ratio=0.05)
        out_name = f"icon-{sz}.png" if sz in [192, 512, 384, 128, 256] else f"favicon-{sz}x{sz}.png"
        if sz == 180:
            out_name = "apple-touch-icon.png"
        img.save(os.path.join(public_dir, out_name), "PNG")
        print(f"Generated {out_name} ({sz}x{sz})")

    # 2. Generate maskable icons with solid dark background (#051424) and safe zone (20% padding)
    for sz in [192, 512]:
        img_maskable = create_square_icon(sz, bg_color=(5, 20, 36, 255), padding_ratio=0.18)
        out_name = f"icon-maskable-{sz}.png"
        img_maskable.save(os.path.join(public_dir, out_name), "PNG")
        print(f"Generated {out_name} ({sz}x{sz})")

    # 3. Generate multi-resolution favicon.ico
    ico_images = [create_square_icon(sz, bg_color=None, padding_ratio=0.05) for sz in [16, 32, 48, 64, 128, 256]]
    ico_path = os.path.join(public_dir, "favicon.ico")
    ico_images[0].save(ico_path, format="ICO", sizes=[(16,16), (32,32), (48,48), (64,64), (128,128), (256,256)], append_images=ico_images[1:])
    print("Generated multi-resolution favicon.ico")

    # 4. Standard favicon.png
    fav32 = create_square_icon(32, bg_color=None, padding_ratio=0.05)
    fav32.save(os.path.join(public_dir, "favicon.png"), "PNG")
    print("Generated favicon.png")

if __name__ == "__main__":
    generate_icons()
