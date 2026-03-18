import React from 'react'

const ImagePreview = ({ src, alt = "Sticker Preview", className = ""}) => {
    if (!src) return null
    
    return (

        <div className={`preview-container ${className}`}>
            <img
                src={src}
                alt={alt}
            />
        </div>
    )
}

export default ImagePreview