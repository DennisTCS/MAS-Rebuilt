// heuristicLogic.js

// SCHEDULING CONSTANTS 
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS_PER_DAY = 13;
const BREAK_PERIOD = 5;
const FRIDAY_PRAYER_PERIOD_START = 11;

// A simple, "greedy" scheduling algorithm that places events in the first available slot. It does not use any soft constraints or scoring.
const runSimpleHeuristicAlgorithm = (eventsToSchedule, rooms) => {
    let timetable = {};
    DAYS.forEach(day => {
        timetable[day] = [];
        for (let i = 1; i <= PERIODS_PER_DAY; i++) {
            timetable[day][i] = { classes: {}, teachers: {}, rooms: {} };
        }
    });

    let unscheduledEvents = [];
    let finalSchedule = {};

    const shuffledEvents = [...eventsToSchedule].sort(() => Math.random() - 0.5);

    for (const event of shuffledEvents) {
        let placed = false;
        for (const day of DAYS) {
            for (let period = 1; period <= PERIODS_PER_DAY - (event.duration - 1); period++) {
                let isSlotAvailable = true;

                // Hard constraint checks
                for (let d = 0; d < event.duration; d++) {
                    const currentPeriod = period + d;
                    if (currentPeriod > PERIODS_PER_DAY) { isSlotAvailable = false; break; }
                    const slotStatus = timetable[day][currentPeriod];
                    if (currentPeriod === BREAK_PERIOD || (day === 'Friday' && currentPeriod >= FRIDAY_PRAYER_PERIOD_START)) { isSlotAvailable = false; break; }
                    if (slotStatus.classes[event.className] || slotStatus.teachers[event.teacherName]) { isSlotAvailable = false; break; }
                }
                if (!isSlotAvailable) continue;

                // Room availability check
                let foundRoom = null;
                if (event.requiresRoomType === 'Standard' && event.homeRoom) {
                    if (!timetable[day][period].rooms[event.homeRoom]) {
                        foundRoom = rooms.find(r => r.name === event.homeRoom);
                    }
                } else {
                    foundRoom = rooms.find(r => r.type === event.requiresRoomType && !timetable[day][period].rooms[r.name]);
                }

                // If a room is found, place the event and stop searching for this event
                if (foundRoom) {
                    for (let d = 0; d < event.duration; d++) {
                        const currentPeriod = period + d;
                        const slotToBook = timetable[day][currentPeriod];
                        slotToBook.classes[event.className] = true;
                        slotToBook.teachers[event.teacherName] = true;
                        slotToBook.rooms[foundRoom.name] = true;
                    }
                    const scheduleKey = `${day}_Period${period}`;
                    if (!finalSchedule[scheduleKey]) finalSchedule[scheduleKey] = [];
                    finalSchedule[scheduleKey].push({ ...event, roomName: foundRoom.name, day: day });
                    placed = true;
                    break;
                }
            }
            if (placed) break;
        }
        if (!placed) {
            unscheduledEvents.push(event);
        }
    }

    return { schedule: finalSchedule, unscheduledEvents: unscheduledEvents, softConstraintViolations: 0 };
};

export const runSimpleHeuristicAnalysis = (numberOfIterations, eventsToSchedule, rooms) => {
    console.log(`Starting simple heuristic analysis with ${numberOfIterations} iterations...`);
    console.time('Total Time');
    let nwsCount = 0;
    let wsCount = 0;
    let bestSchedule = null;
    let lastAttempt = null;
    // Array to store all successful schedules
    const successfulSchedules = [];

    for (let i = 0; i < numberOfIterations; i++) {
        const eventsCopy = JSON.parse(JSON.stringify(eventsToSchedule));
        const result = runSimpleHeuristicAlgorithm(eventsCopy, rooms);
        lastAttempt = result;

        if (result.unscheduledEvents.length > 0) {
            nwsCount++;
        } else {
            wsCount++;
            // Store this successful schedule
            successfulSchedules.push({
                schedule: result.schedule,
                softConstraintViolations: 0, // Simple heuristic doesn't calculate this
                iteration: i + 1, // Track iteration number
                type: 'Workable' // Simple heuristic always produces 'Workable' if complete
            });
            if (!bestSchedule) {
                bestSchedule = result;
            }
        }
    }
    // Note: The simple heuristic does not have a concept of a "Perfect Solution"
    console.log("Simple Heuristic Analysis complete.");
    console.timeEnd('Total Time');

    return {
        nwsCount,
        wsCount,
        psCount: 0,
        bestSchedule,
        successfulSchedules,
        totalIterations: numberOfIterations,
        lastAttempt
    };
};