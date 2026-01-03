const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const CREDENTIALS_PATH = path.join(__dirname, 'google-credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

let calendar = null;

function initializeCalendar() {
    if (calendar) return calendar;

    let authOptions = { scopes: SCOPES };
    const envCreds = process.env.GOOGLE_JSON_CREDENTIALS;

    if (envCreds) {
        try {
            authOptions.credentials = JSON.parse(envCreds);
        } catch (e) {
            console.error('Failed to parse GOOGLE_JSON_CREDENTIALS', e);
            return null;
        }
    } else if (fs.existsSync(CREDENTIALS_PATH)) {
        authOptions.keyFile = CREDENTIALS_PATH;
    } else {
        console.warn('Google Calendar credentials not found at', CREDENTIALS_PATH);
        return null;
    }

    const auth = new google.auth.GoogleAuth(authOptions);

    calendar = google.calendar({ version: 'v3', auth });
    return calendar;
}

/**
 * Lists events for a specific time range.
 */
async function listEvents(calendarId, timeMin, timeMax) {
    const cal = initializeCalendar();
    if (!cal) return [];

    const res = await cal.events.list({
        calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
    });
    return res.data.items;
}

/**
 * Creates an event in Google Calendar.
 */
async function createCalendarEvent(calendarId, event) {
    const cal = initializeCalendar();
    if (!cal) return null;

    const res = await cal.events.insert({
        calendarId,
        resource: event,
    });
    return res.data;
}

/**
 * Checks if a slot is busy in Google Calendar.
 */
async function isSlotBusy(calendarId, start, end) {
    const cal = initializeCalendar();
    if (!cal) return false;

    const res = await cal.freebusy.query({
        requestBody: {
            timeMin: start.toISOString(),
            timeMax: end.toISOString(),
            items: [{ id: calendarId }],
        },
    });

    const busy = res.data.calendars[calendarId].busy;
    return busy && busy.length > 0;
}

/**
 * Updates an event in Google Calendar.
 */
async function updateCalendarEvent(calendarId, eventId, event) {
    const cal = initializeCalendar();
    if (!cal) return null;

    const res = await cal.events.update({
        calendarId,
        eventId,
        resource: event,
    });
    return res.data;
}

/**
 * Deletes an event from Google Calendar.
 */
async function deleteCalendarEvent(calendarId, eventId) {
    const cal = initializeCalendar();
    if (!cal) return false;

    await cal.events.delete({
        calendarId,
        eventId,
    });
    return true;
}

module.exports = {
    listEvents,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    isSlotBusy,
};
