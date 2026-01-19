const os = require("os");

module.exports = function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (
        iface.family === "IPv4" &&
        !iface.internal &&
        !iface.address.startsWith("25.") &&
        !iface.address.startsWith("26.") &&
        !iface.address.startsWith("192.") // giữ đúng yêu cầu của bạn
      ) {
        return iface.address;
      }
    }
  }
  return "localhost";
};
