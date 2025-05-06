import { useState } from "react";

const ImageUpload = ({ onUpload }: { onUpload: (url: string) => void }) => {
    const [preview, setPreview] = useState<string | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);

        // Upload
        const formData = new FormData();
        formData.append("file", file);

        fetch("/api/imageupload/quiz", {
            method: "POST",
            body: formData
        })
        .then(res => res.json())
        .then(data => onUpload(data.url))
        .catch(err => console.error(err));
    };

    return (
        <div>
            <input type="file" accept="image/*" onChange={handleFileSelect} />
            {preview && <img src={preview} alt="Preview" style={{maxWidth: "300px"}} />}
        </div>
    );
};

export default ImageUpload;