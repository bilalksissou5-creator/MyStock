// ============================================
// مكتبة الطباعة — ESC/POS + Web APIs
// ============================================

// ═══════════════════════════════════════════
// ESC/POS Commands
// ═══════════════════════════════════════════
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

const CMD = {
  INIT: [ESC, 0x40],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT: [ESC, 0x21, 0x10],
  DOUBLE_WIDTH: [ESC, 0x21, 0x20],
  DOUBLE_BOTH: [ESC, 0x21, 0x30],
  NORMAL: [ESC, 0x21, 0x00],
  FONT_SMALL: [ESC, 0x4D, 0x01],
  FONT_NORMAL: [ESC, 0x4D, 0x00],
  CUT: [GS, 0x56, 0x00],
  FEED: [LF, LF, LF],
};

// ═══════════════════════════════════════════
// ترميز النص العربي (Windows-1256)
// ═══════════════════════════════════════════
// ملاحظة: معظم الطابعات الحرارية لا تدعم العربية
// تحتاج طابعة تدعم CP1256 أو UTF-8
function encodeText(text) {
  // تحويل النص إلى bytes
  const encoder = new TextEncoder();
  return Array.from(encoder.encode(text));
}

// ═══════════════════════════════════════════
// بناء أوامر ESC/POS
// ═══════════════════════════════════════════
class ReceiptBuilder {
  constructor(paperWidth = 58) {
    this.chunks = [];
    this.paperWidth = paperWidth; // 58 أو 80
    // 58mm = 32 حرف تقريباً
    // 80mm = 48 حرف
    this.charsPerLine = paperWidth === 80 ? 48 : 32;
    this.add(CMD.INIT);
  }

  add(bytes) {
    this.chunks.push(...bytes);
    return this;
  }

  addText(text) {
    this.chunks.push(...encodeText(text));
    return this;
  }

  alignCenter() { return this.add(CMD.ALIGN_CENTER); }
  alignLeft() { return this.add(CMD.ALIGN_LEFT); }
  alignRight() { return this.add(CMD.ALIGN_RIGHT); }

  bold(on = true) {
    return this.add(on ? CMD.BOLD_ON : CMD.BOLD_OFF);
  }

  doubleHeight() { return this.add(CMD.DOUBLE_HEIGHT); }
  doubleWidth() { return this.add(CMD.DOUBLE_WIDTH); }
  doubleBoth() { return this.add(CMD.DOUBLE_BOTH); }
  normalSize() { return this.add(CMD.NORMAL); }

  line(text = '') {
    this.addText(text);
    this.chunks.push(LF);
    return this;
  }

  // خط فاصل
  separator(char = '-') {
    return this.line(char.repeat(this.charsPerLine));
  }

  // صف بعمودين (يسار + يمين)
  row(left, right) {
    const leftStr = String(left);
    const rightStr = String(right);
    const spaceCount = Math.max(1, this.charsPerLine - leftStr.length - rightStr.length);
    return this.line(leftStr + ' '.repeat(spaceCount) + rightStr);
  }

  feed(n = 1) {
    for (let i = 0; i < n; i++) this.chunks.push(LF);
    return this;
  }

  cut() {
    this.add(CMD.FEED);
    this.add(CMD.CUT);
    return this;
  }

  build() {
    return new Uint8Array(this.chunks);
  }
}

// ═══════════════════════════════════════════
// طباعة Bluetooth
// ═══════════════════════════════════════════
let bluetoothDevice = null;
let bluetoothCharacteristic = null;

// خدمات Bluetooth للطابعات الحرارية
const PRINTER_SERVICES = [
  0xFF00, // Common for thermal printers
  0x18F0, // Common
  0xFFE0, // Common
  0xFF80,
  0x49535343, // ISSC
];

const PRINTER_CHARACTERISTICS = [
  0xFF02,
  0xFF01,
  0xFFE1,
  0x2AF1,
  0x49535343,
];

async function connectBluetoothPrinter() {
  if (!navigator.bluetooth) {
    throw new Error('Bluetooth غير مدعوم في هذا المتصفح');
  }

  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: PRINTER_SERVICES,
    });

    const server = await device.gatt.connect();

    // البحث عن خدمة الطباعة
    let characteristic = null;
    for (const serviceUuid of PRINTER_SERVICES) {
      try {
        const service = await server.getPrimaryService(serviceUuid);
        for (const charUuid of PRINTER_CHARACTERISTICS) {
          try {
            characteristic = await service.getCharacteristic(charUuid);
            if (characteristic) break;
          } catch (e) { /* تجاهل */ }
        }
        if (characteristic) break;
      } catch (e) { /* تجاهل */ }
    }

    // إذا لم نجد، ابحث في كل الخدمات
    if (!characteristic) {
      const services = await server.getPrimaryServices();
      for (const service of services) {
        const chars = await service.getCharacteristics();
        for (const char of chars) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            characteristic = char;
            break;
          }
        }
        if (characteristic) break;
      }
    }

    if (!characteristic) {
      throw new Error('لم يتم العثور على خدمة الطباعة');
    }

    bluetoothDevice = device;
    bluetoothCharacteristic = characteristic;

    return {
      id: device.id,
      name: device.name || 'طابعة Bluetooth',
    };
  } catch (err) {
    throw new Error('فشل الاتصال: ' + err.message);
  }
}

async function printBluetooth(data) {
  if (!bluetoothCharacteristic) {
    throw new Error('لا يوجد اتصال بطابعة Bluetooth');
  }

  // الكتابة على شكل chunks (204 bytes)
  const chunkSize = 204;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await bluetoothCharacteristic.writeValue(chunk);
  }
}

function disconnectBluetooth() {
  if (bluetoothDevice?.gatt?.connected) {
    bluetoothDevice.gatt.disconnect();
  }
  bluetoothDevice = null;
  bluetoothCharacteristic = null;
}

function isBluetoothConnected() {
  return !!(bluetoothDevice?.gatt?.connected && bluetoothCharacteristic);
}

// ═══════════════════════════════════════════
// طباعة USB
// ═══════════════════════════════════════════
let usbDevice = null;
let usbEndpoint = null;

async function connectUsbPrinter() {
  if (!navigator.usb) {
    throw new Error('USB غير مدعوم في هذا المتصفح');
  }

  try {
    const device = await navigator.usb.requestDevice({
      filters: [], // كل الأجهزة
    });

    await device.open();

    // اختيار الإعدادات
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }

    // البحث عن واجهة الطباعة
    let foundEndpoint = null;
    for (const iface of device.configuration.interfaces) {
      for (const alt of iface.alternates) {
        for (const ep of alt.endpoints) {
          if (ep.direction === 'out') {
            try {
              await device.claimInterface(iface.interfaceNumber);
              foundEndpoint = { interface: iface.interfaceNumber, endpoint: ep.endpointNumber };
              break;
            } catch (e) { /* حاول مع الآخر */ }
          }
        }
        if (foundEndpoint) break;
      }
      if (foundEndpoint) break;
    }

    if (!foundEndpoint) {
      throw new Error('لم يتم العثور على منفذ الطباعة');
    }

    usbDevice = device;
    usbEndpoint = foundEndpoint;

    return {
      id: `${device.vendorId}-${device.productId}`,
      name: device.productName || 'طابعة USB',
    };
  } catch (err) {
    throw new Error('فشل الاتصال: ' + err.message);
  }
}

async function printUsb(data) {
  if (!usbDevice || !usbEndpoint) {
    throw new Error('لا يوجد اتصال بطابعة USB');
  }

  const result = await usbDevice.transferOut(usbEndpoint.endpoint, data);

  if (result.status !== 'ok') {
    throw new Error('فشل إرسال البيانات: ' + result.status);
  }
}

function isUsbConnected() {
  return !!(usbDevice && usbEndpoint);
}

// ═══════════════════════════════════════════
// دوال مساعدة
// ═══════════════════════════════════════════

// الاتصال بالطابعة الافتراضية
async function printReceipt(receiptData, connectionType) {
  const builder = new ReceiptBuilder(receiptData.paperWidth || 58);
  buildReceiptContent(builder, receiptData);
  const data = builder.build();

  if (connectionType === 'bluetooth') {
    await printBluetooth(data);
  } else if (connectionType === 'usb') {
    await printUsb(data);
  } else {
    throw new Error('نوع الاتصال غير مدعوم');
  }
}

// بناء محتوى الفاتورة
function buildReceiptContent(builder, data) {
  builder.alignCenter();
  builder.doubleBoth();
  builder.bold(true);
  builder.line(data.orgName || 'MyStock');
  builder.normalSize();
  builder.bold(false);
  builder.feed(1);

  builder.alignLeft();
  builder.separator();

  if (data.invoiceNumber) {
    builder.row('رقم الفاتورة:', data.invoiceNumber);
  }
  if (data.date) {
    builder.row('التاريخ:', data.date);
  }
  if (data.supplierName) {
    builder.row('المورد:', data.supplierName);
  }

  builder.separator();
  builder.bold(true);
  builder.line('المنتجات');
  builder.bold(false);
  builder.separator();

  if (data.items) {
    data.items.forEach(item => {
      builder.line(item.name);
      builder.row(`  ${item.qty} × ${Number(item.price).toFixed(2)}`, Number(item.qty * item.price).toFixed(2));
    });
  }

  builder.separator();
  builder.bold(true);
  builder.row('الإجمالي:', Number(data.total || 0).toFixed(2));
  builder.bold(false);
  builder.feed(2);
  builder.alignCenter();
  builder.line('شكراً لتعاملكم معنا');
  builder.feed(2);
  builder.cut();
}

// ═══════════════════════════════════════════
// تصدير
// ═══════════════════════════════════════════
window.Printer = {
  ReceiptBuilder,
  connectBluetoothPrinter,
  printBluetooth,
  disconnectBluetooth,
  isBluetoothConnected,
  connectUsbPrinter,
  printUsb,
  isUsbConnected,
  printReceipt,
  buildReceiptContent,
};