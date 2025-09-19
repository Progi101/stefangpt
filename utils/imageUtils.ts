
export const resizeImageFromFile = (
    file: File,
    maxDimension: number = 768, 
    quality: number = 0.85
): Promise<{ dataUrl: string; mimeType: string; }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("FileReader did not return a result."));
            }
            const dataUrl = event.target.result as string;

            const img = new Image();
            img.src = dataUrl;
            
            img.onload = () => {
                const { width, height } = img;
                if (width === 0 || height === 0) {
                    return reject(new Error("Image has zero dimensions, cannot process."));
                }
                
                let newWidth = width;
                let newHeight = height;

                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        newWidth = maxDimension;
                        newHeight = Math.round((height * maxDimension) / width);
                    } else {
                        newHeight = maxDimension;
                        newWidth = Math.round((width * maxDimension) / height);
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = newWidth;
                canvas.height = newHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get 2D canvas context'));
                }
                ctx.drawImage(img, 0, 0, newWidth, newHeight);
                
                const mimeType = 'image/jpeg';
                const resizedDataUrl = canvas.toDataURL(mimeType, quality);
                resolve({ dataUrl: resizedDataUrl, mimeType });
            };

            img.onerror = () => reject(new Error(`Image loading failed. The file might be corrupt or an unsupported format.`));
        };

        reader.onerror = () => reject(new Error(`Failed to read the file.`));
    });
};

export const resizeImageFromDataUrl = (
    dataUrl: string,
    maxDimension: number = 1024,
    quality: number = 0.9
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = dataUrl;

        img.onload = () => {
            const { width, height } = img;
             if (width === 0 || height === 0) {
                return reject(new Error("Image has zero dimensions, cannot process."));
            }

            let newWidth = width;
            let newHeight = height;

            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    newWidth = maxDimension;
                    newHeight = Math.round((height * maxDimension) / width);
                } else {
                    newHeight = maxDimension;
                    newWidth = Math.round((width * maxDimension) / height);
                }
            } else {
                // If it's smaller, we still re-encode to control quality and ensure consistent format (JPEG)
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = newWidth;
            canvas.height = newHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get 2D canvas context for resizing.'));
            }
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            
            const resizedDataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(resizedDataUrl);
        };

        img.onerror = () => reject(new Error('Failed to load AI image from data URL for resizing.'));
    });
};
