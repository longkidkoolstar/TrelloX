import React, { createContext, useState, useContext, ReactNode } from 'react';

interface ModalContextType {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModalContext = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModalContext must be used within a ModalProvider');
  }
  return context;
};

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCount, setModalCount] = useState(0);

  const openModal = () => {
    setModalCount(prev => prev + 1);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setModalCount(prev => {
      const newCount = prev - 1;
      if (newCount <= 0) {
        setIsModalOpen(false);
        return 0;
      }
      return newCount;
    });
  };

  return (
    <ModalContext.Provider value={{ isModalOpen, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
};