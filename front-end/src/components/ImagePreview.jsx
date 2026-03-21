import React, { useState } from 'react'

const ImagePreview = ({ src, alt = "Sticker Preview", className = ""}) => {
    const [hasError, setHasError] = useState(false);

    if (!src) return null

    return (

        <div className={`preview-container ${className}`}>
            <img
                src={src}
                alt={alt}
                // onError={() => setHasError(true)}
                style={{width: '200px'}}

            />
        </div>
    )
}

export default ImagePreview