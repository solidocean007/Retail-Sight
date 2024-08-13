import React, { useState } from 'react';
import { motion } from 'framer-motion';
import './menuTab.css'

const CircleMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className='menu-tab open' style={{ position: 'relative', width: '100%', height: '100vh', background: '#fff' }}>
      <motion.div
        animate={{
          scale: isOpen ? 1 : 0,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          width: 100,
          height: 100,
          backgroundColor: '#0f0',
          borderRadius: '50%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onClick={toggleMenu}
      >
        +
      </motion.div>

      {isOpen && (
        <>
          <motion.div
            animate={{
              scale: 1,
              opacity: 1,
              x: -110,
              y: 20,
            }}
            transition={{ delay: 0.1, duration: 0.3 }}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 60,
              height: 60,
              backgroundColor: '#ff0',
              borderRadius: '50%',
            }}
          />
          <motion.div
            animate={{
              scale: 1,
              opacity: 1,
              x: -50,
              y: 110,
            }}
            transition={{ delay: 0.2, duration: 0.3 }}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 60,
              height: 60,
              backgroundColor: '#ff0',
              borderRadius: '50%',
            }}
          />
          <motion.div
            animate={{
              scale: 1,
              opacity: 1,
              x: 50,
              y: 110,
            }}
            transition={{ delay: 0.3, duration: 0.3 }}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 60,
              height: 60,
              backgroundColor: '#ff0',
              borderRadius: '50%',
            }}
          />
        </>
      )}
    </div>
  );
};

export default CircleMenu;
