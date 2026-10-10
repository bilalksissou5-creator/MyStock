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
// ترميز النص
// ═══════════════════════════════════════════
function encodeText(text) {
  const encoder = new TextEncoder();
  return Array.from(encoder.encode(text));
}

// ═══════════════════════════════════════════
// بناء أوامر ESC/POS
// ═══════════════════════════════════════════
class ReceiptBuilder {
  constructor(paperWidth = 58) {
    this.chunks = [];
    this.paperWidth = paperWidth;
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

  separator(char = '-') {
    return this.line(char.repeat(this.charsPerLine));
  }

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
// Bluetooth
// ═══════════════════════════════════════════
let bluetoothDevice = null;
let bluetoothCharacteristic = null;

// خدمات الطابعات الحرارية الشائعة (UUIDs كاملة)
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000ff80-0000-1000-8000-00805f9b34fb',
  '0000ff10-0000-1000-8000-00805f9b34fb',
  '0000ff01-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];

async function connectBluetoothPrinter() {
  if (!navigator.bluetooth) {
    throw new Error('Bluetooth غير مدعوم في هذا المتصفح. استخدم Chrome على Android.');
  }

  // ✅ محاولة واحدة: كل الأجهزة
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICES,
  });

  if (!device) {
    throw new Error('لم يتم اختيار أي جهاز');
  }

  // الاتصال
  let server;
  try {
    server = await device.gatt.connect();
  } catch (e) {
    throw new Error('فشل الاتصال بالجهاز: ' + e.message);
  }

  // البحث عن خدمة الكتابة
  let characteristic = null;

  // 1. جرّب خدمات الطابعات المعروفة
  for (const serviceUuid of PRINTER_SERVICES) {
    try {
      const service = await server.getPrimaryService(serviceUuid);
      const chars = await service.getCharacteristics();
      for (const char of chars) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          characteristic = char;
          break;
        }
      }
      if (characteristic) break;
    } catch (e) { /* تجاهل */ }
  }

  // 2. إذا لم نجد، ابحث في كل الخدمات
  if (!characteristic) {
    try {
      const services = await server.getPrimaryServices();
      for (const service of services) {
        try {
          const chars = await service.getCharacteristics();
          for (const char of chars) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              characteristic = char;
              break;
            }
          }
          if (characteristic) break;
        } catch (e) { /* تجاهل */ }
      }
    } catch (e) { /* تجاهل */ }
  }

  if (!characteristic) {
    // اقطع الاتصال لأننا لا نستطيع الطباعة
    if (device.gatt.connected) device.gatt.disconnect();
    throw new Error('الجهاز لا يدعم الطباعة (لا يوجد منفذ كتابة). اختر طابعة حرارية.');
  }

  bluetoothDevice = device;
  bluetoothCharacteristic = characteristic;

  return {
    id: device.id,
    name: device.name || 'طابعة Bluetooth',
  };
}

async function printBluetooth(data) {
  if (!bluetoothCharacteristic) {
    throw new Error('لا يوجد اتصال بطابعة Bluetooth');
  }

  const chunkSize = 200;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await bluetoothCharacteristic.writeValue(chunk);
    // تأخير بسيط بين الحزم لتفادي فقدان البيانات
    await new Promise(r => setTimeout(r, 20));
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
// USB
// ═══════════════════════════════════════════
let usbDevice = null;
let usbEndpoint = null;

async function connectUsbPrinter() {
  if (!navigator.usb) {
    throw new Error('USB غير مدعوم في هذا المتصفح. استخدم Chrome على حاسوب.');
  }

  const device = await navigator.usb.requestDevice({ filters: [] });

  await device.open();

  if (device.configuration === null) {
    await device.selectConfiguration(1);
  }

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