import axios from "axios";

// ✅ Email (via backend)
export const sendToEmail = async (recipient, subject = "NodAi's Crew Output", body) => {
  try {
    await axios.post("http://localhost:8000/send-email", {
      to: recipient,
      subject,
      body,
    });
    return "✅ Email sent successfully";
  } catch (error) {
    return `❌ Email failed: ${error.message}`;
  }
};

// ✅ Discord (direct webhook)
export const postToDiscord = async (webhookUrl, content) => {
  try {
    await axios.post(webhookUrl, { content });
    return "✅ Posted to Discord";
  } catch (error) {
    return `❌ Discord error: ${error.message}`;
  }
};

// ✅ Google Sheets (via backend)
export const pushToSheets = async (spreadsheetId, values) => {
  try {
    await axios.post("http://localhost:8000/send-sheets", {
      spreadsheetId,
      values,
    });
    return "✅ Logged to Sheets";
  } catch (error) {
    return `❌ Sheets error: ${error.message}`;
  }
};

// ✅ Slack (direct webhook)
export const postToSlack = async (webhookUrl, message) => {
  try {
    await axios.post(webhookUrl, { text: message });
    return "✅ Sent to Slack";
  } catch (error) {
    return `❌ Slack error: ${error.message}`;
  }
};
