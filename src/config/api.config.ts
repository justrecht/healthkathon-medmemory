/**
 * API Configuration
 * 
 * Update this file based on your development setup:
 * 
 * 1. ANDROID EMULATOR: Use "http://10.0.2.2:8000/api"
 * 2. PHYSICAL DEVICE: Use "http://YOUR_COMPUTER_IP:8000/api"
 *    - Find your IP: Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
 *    - Example: "http://192.168.1.2:8000/api"
 * 3. IOS SIMULATOR: Use "http://localhost:8000/api"
 * 4. EXPO GO: Use "http://YOUR_COMPUTER_IP:8000/api"
 */

export const API_CONFIG = {
  // Set this to true if testing on a physical Android device or using Expo Go
  USE_PHYSICAL_DEVICE: false,
  
  // Your computer's IP address (update this with your actual IP)
  COMPUTER_IP: "192.168.1.2",
  
  // Backend port
  PORT: 8000,
};
