function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ error: "No data" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    var tipo = data.tipo;
    var datos = data.datos;

    var SPREADSHEET_ID = '1pC_w0Z8Qy4UdgJNmaxdNCK8QPvkRXUUxJoJgc83xx-I';
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (tipo === 'pago') {
      var sheet = ss.getSheetByName('Pagos');
      if (sheet) {
        sheet.appendRow([
          new Date(), 
          datos.email || 'N/A', 
          datos.plan || 'N/A', 
          datos.monto || '0.00', 
          datos.moneda || 'USD',
          datos.pasarela || 'PayPal',
          datos.estado || 'Completado', 
          datos.sessionId || 'N/A',
          datos.detalles || ''
        ]);
      }
    } else if (tipo === 'sesion') {
      var sheet = ss.getSheetByName('Sesiones');
      if (sheet) {
        sheet.appendRow([
          datos.sessionId, 
          new Date(), 
          datos.estado || 'activa', 
          datos.pdfUrl || ''
        ]);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Datos guardados" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ status: "OK", message: "Backend funcionando" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function testGuardarPago() {
  var mockData = {
    tipo: 'pago',
    datos: {
      email: 'test@ejemplo.com',
      plan: 'pro',
      monto: '4.99',
      moneda: 'USD',
      pasarela: 'PayPal',
      estado: 'Completado',
      sessionId: 'test-session-123',
      detalles: 'Token de prueba'
    }
  };
  
  var mockEvent = { postData: { contents: JSON.stringify(mockData) } };
  var response = doPost(mockEvent);
  Logger.log(response.getContent());
}