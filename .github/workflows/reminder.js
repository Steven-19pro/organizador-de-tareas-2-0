const fs = require('fs');
const https = require('https');

// Leer archivo de tareas
const data = JSON.parse(fs.readFileSync('tasks.json', 'utf8'));
const { config, tasks } = data;

// Función para enviar mensaje de Telegram
function sendTelegramMessage(message) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      chat_id: config.telegramChatId,
      text: message,
      parse_mode: 'Markdown'
    });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${config.telegramToken}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Mensaje enviado:', message.substring(0, 50));
          resolve(true);
        } else {
          console.error('❌ Error al enviar:', body);
          reject(false);
        }
      });
    });

    req.on('error', (e) => {
      console.error('❌ Error de conexión:', e);
      reject(false);
    });

    req.write(postData);
    req.end();
  });
}

// Función principal
async function checkReminders() {
  const now = new Date();
  let hasChanges = false;

  console.log(`🕐 Verificando recordatorios: ${now.toLocaleString('es-ES')}`);

  for (const task of tasks) {
    if (task.completed || task.notified) continue;

    const taskDateTime = new Date(`${task.date}T${task.time}`);
    const timeDiff = taskDateTime - now;

    // Si faltan entre 0 y 5 minutos
    if (timeDiff > 0 && timeDiff <= 300000) {
      console.log(`⏰ Enviando recordatorio: ${task.title}`);

      const message = `🔔 *RECORDATORIO AUTOMÁTICO*\n\n` +
                     `📌 *${task.title}*\n` +
                     `⏰ Hora: ${task.time}\n` +
                     `📅 Fecha: ${new Date(task.date).toLocaleDateString('es-ES')}\n` +
                     `${task.description ? `\n📝 ${task.description}\n` : ''}` +
                     `\n⚠️ *Esta tarea comienza en ${Math.round(timeDiff / 60000)} minutos*`;

      try {
        await sendTelegramMessage(message);
        task.notified = true;
        hasChanges = true;
      } catch (error) {
        console.error('Error al enviar recordatorio:', error);
      }
    }
  }

  // Guardar cambios si hubo notificaciones
  if (hasChanges) {
    fs.writeFileSync('tasks.json', JSON.stringify({ config, tasks }, null, 2));
    console.log('💾 Archivo actualizado');
  } else {
    console.log('✨ No hay recordatorios pendientes');
  }
}

checkReminders().catch(console.error);
