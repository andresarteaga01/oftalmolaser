import React from "react";
import Modal from "react-modal";

const tipos = ["Procesada", "Procesada", "GradCAM"];

const LightboxViewer = ({ open, onClose, sets, index, subIndex, setSubIndex }) => {
  if (!sets || sets.length === 0 || !sets[index]) {
    return null;
  }

  const imagenActual = sets[index];
  const imagenes = [
    imagenActual.original,
    imagenActual.procesada,
    imagenActual.gradcam,
  ];

  const handleNext = () => setSubIndex((prev) => (prev + 1) % imagenes.length);
  const handlePrev = () => setSubIndex((prev) => (prev - 1 + imagenes.length) % imagenes.length);

  return (
    <Modal
      isOpen={open}
      onRequestClose={onClose}
      contentLabel="Lightbox"
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50"
      overlayClassName="overlay"
      ariaHideApp={false}
    >
      <div className="bg-white p-4 rounded shadow-lg relative max-w-full max-h-full">
        <button onClick={onClose} className="absolute top-2 right-2 text-xl">✖</button>
        <h2 className="text-center mb-2 font-bold text-lg">{tipos[subIndex]}</h2>
        {imagenes[subIndex] ? (
          <img
            src={imagenes[subIndex]}
            alt="Vista"
            className="max-h-[70vh] max-w-[90vw] object-contain border rounded"
          />
        ) : (
          <p className="text-center text-gray-400">No disponible</p>
        )}
        <div className="flex justify-between mt-4">
          <button onClick={handlePrev} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
            ◀ Anterior
          </button>
          <button onClick={handleNext} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
            Siguiente ▶
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default LightboxViewer;