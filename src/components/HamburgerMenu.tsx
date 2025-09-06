import React, { useState, useEffect } from 'react';
import { Menu, X, Users, Building2, Settings } from 'lucide-react';

interface HamburgerMenuProps {
  onManageCrew: () => void;
  onManageProperties: () => void;
  onManageTenants: () => void;
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  onManageCrew,
  onManageProperties,
  onManageTenants
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeMenu();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleMenuAction = (action: () => void) => {
    action();
    closeMenu();
  };

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={toggleMenu}
        className="flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={closeMenu}
        />
      )}

      {/* Menu Panel */}
      <div className={`fixed top-0 left-0 h-full w-full sm:w-80 bg-white shadow-xl transform z-50 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Admin Menu</h2>
          <button
            onClick={closeMenu}
            className="text-gray-400 hover:text-gray-600 p-2 -m-2"
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Manage Crew */}
          <button
            onClick={() => handleMenuAction(onManageCrew)}
            className="w-full flex items-center px-4 py-3 text-left text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors"
          >
            <Users className="h-5 w-5 mr-3" />
            <div>
              <div className="font-medium">Manage Crew</div>
              <div className="text-sm text-gray-500">Add or remove crew members</div>
            </div>
          </button>

          {/* Manage Properties */}
          <button
            onClick={() => handleMenuAction(onManageProperties)}
            className="w-full flex items-center px-4 py-3 text-left text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors"
          >
            <Building2 className="h-5 w-5 mr-3" />
            <div>
              <div className="font-medium">Property Management</div>
              <div className="text-sm text-gray-500">Add or remove properties</div>
            </div>
          </button>

          {/* Manage Tenants */}
          <button
            onClick={() => handleMenuAction(onManageTenants)}
            className="w-full flex items-center px-4 py-3 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors"
          >
            <Settings className="h-5 w-5 mr-3" />
            <div>
              <div className="font-medium">Tenant Management</div>
              <div className="text-sm text-gray-500">Add or remove tenant access</div>
            </div>
          </button>
        </div>
      </div>
    </>
  );
};

export default HamburgerMenu;
