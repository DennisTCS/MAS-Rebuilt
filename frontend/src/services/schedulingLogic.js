// schedulingLogic.js

import Papa from 'papaparse';

// SCHEDULING CONSTANTS
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS_PER_DAY = 13;
const BREAK_PERIOD = 5;
const FRIDAY_PRAYER_PERIOD_START = 11;
const MAX_CONSECUTIVE_PERIODS = 4;

// The impact of pheromone. Higher value means failed events are strongly avoided.
const PHEROMONE_IMPACT = 10;

// This is the internal scheduling engine.
const runSchedulingAlgorithm = (eventsToSchedule, rooms, pheromoneMap) => {
    let timetable = {};
    DAYS.forEach(day => {
        timetable[day] = [];
        for (let i = 1; i <= PERIODS_PER_DAY; i++) {
            timetable[day][i] = { classes: {}, teachers: {}, rooms: {}, eventDetails: {} };
        }
    });

    let unscheduledEvents = [];
    let finalSchedule = {};
    let softConstraintViolations = 0;

    let remainingEvents = [...eventsToSchedule];
    const assemblyEventIndex = remainingEvents.findIndex(e => e.subjectName === 'Perhimpunan');

    if (assemblyEventIndex > -1) {
        const assemblyEvent = remainingEvents[assemblyEventIndex];
        const assemblyDay = 'Wednesday';
        const assemblyPeriod = 1;

        // Find the room based on the event's requirement
        const assemblyRoom = rooms.find(r => r.type === assemblyEvent.requiresRoomType);

        if (assemblyRoom) {
            const slotToBook = timetable[assemblyDay][assemblyPeriod];
            // Block all resources for the Assembly
            slotToBook.classes['Assembly'] = true;
            slotToBook.teachers['*ALL_STAFF*'] = true;
            slotToBook.rooms[assemblyRoom.name] = true;

            // Add it to the final schedule object
            const scheduleKey = `${assemblyDay}_Period${assemblyPeriod}`;
            finalSchedule[scheduleKey] = [{...assemblyEvent, roomName: assemblyRoom.name, day: assemblyDay}];
        } else {
            // If no suitable hall is found, the Assembly cannot be scheduled.
            unscheduledEvents.push(assemblyEvent);
        }

        // After placing it once, filter out ALL assembly events to prevent any duplicates.
        remainingEvents = remainingEvents.filter(e => e.subjectName !== 'Perhimpunan');
    }

    // The rest of the algorithm now works with the 'remainingEvents' list
    const processedEvents = [];
    const processedSessionIds = new Set();
    for (const event of remainingEvents) {
        if (event.SessionID && !processedSessionIds.has(event.SessionID)) {
            const groupEvents = remainingEvents.filter(e => e.SessionID === event.SessionID);
            processedEvents.push({ isGroup: true, events: groupEvents, ...groupEvents[0] });
            processedSessionIds.add(event.SessionID);
        } else if (!event.SessionID) {
            processedEvents.push({ isGroup: false, events: [event], ...event });
        }
    }

    const shuffledJobs = processedEvents.sort(() => Math.random() - 0.5);

    for (const job of shuffledJobs) {
        let availableSlots = [];
        const eventsInJob = job.events;
        // Determine the key for this job for pheromone lookup
        const jobPheromoneKey = job.SessionID || job.eventId;
        const currentPheromone = pheromoneMap.get(jobPheromoneKey) || 0;

        for (const day of DAYS) {
            for (let period = 1; period <= PERIODS_PER_DAY - (job.duration - 1); period++) {
                let isSlotAvailable = true;

                // Hard Constraint Checks
                for (const scheduleEvent of eventsInJob) {
                    for (let d = 0; d < scheduleEvent.duration; d++) {
                        const currentPeriod = period + d;
                        if (currentPeriod > PERIODS_PER_DAY) { isSlotAvailable = false; break; }
                        const slotStatus = timetable[day][currentPeriod];
                        if (currentPeriod === BREAK_PERIOD || (day === 'Friday' && currentPeriod >= FRIDAY_PRAYER_PERIOD_START)) { isSlotAvailable = false; break; }
                        if (slotStatus.classes[scheduleEvent.className] || slotStatus.teachers[scheduleEvent.teacherName] || slotStatus.classes['Assembly']) { isSlotAvailable = false; break; }
                    }
                    if (!isSlotAvailable) break;
                }
                if (!isSlotAvailable) continue;

                let assignedRoomsForJob = [];
                const isMassLecture = job.isGroup && job.requiresRoomType !== 'Standard';
                let tempBookedRooms = {};
                if (isMassLecture) {
                    const sharedRoom = rooms.find(r => r.type === job.requiresRoomType && !timetable[day][period].rooms[r.name]);
                    if (sharedRoom) {
                        assignedRoomsForJob = eventsInJob.map(e => ({ eventId: e.eventId, room: sharedRoom }));
                    } else { isSlotAvailable = false; }
                } else {
                    let canFulfillAllRooms = true;
                    for (const event of eventsInJob) {
                        let foundRoom = null;
                        if (event.requiresRoomType === 'Standard' && event.homeRoom) {
                            if (!tempBookedRooms[event.homeRoom] && !timetable[day][period].rooms[event.homeRoom]) {
                                foundRoom = rooms.find(r => r.name === event.homeRoom);
                            }
                        } else {
                            foundRoom = rooms.find(r => r.type === event.requiresRoomType && !tempBookedRooms[r.name] && !timetable[day][period].rooms[r.name]);
                        }
                        if (foundRoom) {
                            tempBookedRooms[foundRoom.name] = true;
                            assignedRoomsForJob.push({ eventId: event.eventId, room: foundRoom });
                        } else { canFulfillAllRooms = false; break; }
                    }
                    if (!canFulfillAllRooms) isSlotAvailable = false;
                }
                if (!isSlotAvailable) continue;

                let score = 0;
                // Soft Constraints Scoring
                if (job.teacherName !== '*ALL_STAFF*') {
                    let consecutiveBefore = 0;
                    for (let p = period - 1; p >= 1; p--) {
                        if (p === BREAK_PERIOD || (day === 'Friday' && p >= FRIDAY_PRAYER_PERIOD_START)) break;
                        if (timetable[day][p].teachers[job.teacherName]) { consecutiveBefore++; } else { break; }
                    }
                    let consecutiveAfter = 0;
                    for (let p = period + job.duration; p <= PERIODS_PER_DAY; p++) {
                        if (p === BREAK_PERIOD || (day === 'Friday' && p >= FRIDAY_PRAYER_PERIOD_START)) break;
                        if (timetable[day][p].teachers[job.teacherName]) { consecutiveAfter++; } else { break; }
                    }
                    const totalConsecutive = consecutiveBefore + job.duration + consecutiveAfter;
                    if (totalConsecutive > MAX_CONSECUTIVE_PERIODS) {
                        score -= 5;
                    }
                }
                if (period <= 4) {
                    score += 3;
                } else if (period >= 9 && period < FRIDAY_PRAYER_PERIOD_START) {
                    score -= (period - 8);
                }
                const periodBefore = period - 1;
                if (periodBefore > 0 && periodBefore !== BREAK_PERIOD) {
                    if (Object.keys(timetable[day][periodBefore].classes).some(c => eventsInJob.find(e => e.className === c))) {
                        score += 2;
                    }
                }

                // Apply Pheromone Influence
                score -= (currentPheromone * PHEROMONE_IMPACT);


                availableSlots.push({ day, period, rooms: assignedRoomsForJob, score });
            }
        }

        if (availableSlots.length > 0) {
            availableSlots.sort((a, b) => b.score - a.score);
            const chosenSlot = availableSlots[0];

            if (chosenSlot.score < 0) {
                softConstraintViolations++;
            }

            for (const event of eventsInJob) {
                const assignedRoom = chosenSlot.rooms.find(r => r.eventId === event.eventId).room;
                for (let d = 0; d < event.duration; d++) {
                    const currentPeriod = chosenSlot.period + d;
                    const slotToBook = timetable[chosenSlot.day][currentPeriod];
                    slotToBook.classes[event.className] = true;
                    slotToBook.teachers[event.teacherName] = true;
                    slotToBook.rooms[assignedRoom.name] = true;
                }
                const scheduleKey = `${chosenSlot.day}_Period${chosenSlot.period}`;
                if (!finalSchedule[scheduleKey]) finalSchedule[scheduleKey] = [];
                finalSchedule[scheduleKey].push({ ...event, roomName: assignedRoom.name, day: chosenSlot.day });
            }
        } else {
            unscheduledEvents.push(...eventsInJob);
        }
    }

    return { schedule: finalSchedule, unscheduledEvents: unscheduledEvents, softConstraintViolations: softConstraintViolations };
};

// These are the functions the UI component will import and use.
export const processUploadedData = (classroomsCsvText, assignmentsCsvText) => {

    const parseAndTrim = (csvText) => {
        const result = Papa.parse(csvText, { header: true, skipEmptyLines: true }).data;
        return result.map(row => {
            const trimmedRow = {};
            for (const key in row) {
                trimmedRow[key.trim()] = row[key].trim();
            }
            return trimmedRow;
        });
    };

    const parsedClassrooms = parseAndTrim(classroomsCsvText);
    const parsedAssignments = parseAndTrim(assignmentsCsvText);

    const rooms = parsedClassrooms.map(room => ({ name: room.RoomName, type: room.Type }));
    const eventsToSchedule = [];
    const allClassNames = new Set();
    const allTeacherNames = new Set();

    for (const assignment of parsedAssignments) {
        if (!assignment.ClassName || !assignment.PeriodsPerWeek) continue;

        allClassNames.add(assignment.ClassName);
        if (assignment.TeacherName !== '*ALL_STAFF*') { allTeacherNames.add(assignment.TeacherName); }

        const periodsPerWeek = parseInt(assignment.PeriodsPerWeek, 10);
        const blockSize = parseInt(assignment.DefaultBlockSize, 10) || 1;

        if (isNaN(periodsPerWeek) || isNaN(blockSize) || periodsPerWeek <= 0 || blockSize <= 0) continue;

        const numberOfBlocksToSchedule = Math.ceil(periodsPerWeek / blockSize);

        for (let i = 0; i < numberOfBlocksToSchedule; i++) {
            // SessionID Mechanism
            const uniqueSessionID = assignment.SessionID ? `${assignment.SessionID}_${i}` : null;

            eventsToSchedule.push({
                eventId: `${assignment.ClassName}-${assignment.SubjectName}-${i + 1}`,
                className: assignment.ClassName,
                homeRoom: assignment.HomeRoom,
                subjectName: assignment.SubjectName,
                teacherName: assignment.TeacherName,
                requiresRoomType: assignment.RequiresRoomType,
                duration: blockSize,
                SessionID: uniqueSessionID
            });
        }
    }
    return { eventsToSchedule, rooms, allClassNames: [...allClassNames], allTeacherNames: [...allTeacherNames] };
};

export const runAnalysisWithLearning = (numberOfIterations, eventsToSchedule, rooms) => {
    console.log(`Starting analysis with ${numberOfIterations} iterations...`);
    console.time('Total Iteration Time');
    let nwsCount = 0, wsCount = 0, psCount = 0;
    let bestSchedule = null;
    let lastAttempt = null;
    const successfulSchedules = [];
    const pheromoneMap = new Map();
    const EVAPORATION_RATE = 0.05; // Pheromone decay rate

    for (let i = 0; i < numberOfIterations; i++) {
        const eventsCopy = JSON.parse(JSON.stringify(eventsToSchedule));
        // Pass the pheromoneMap to the scheduling algorithm so it can use the learned information.
        const result = runSchedulingAlgorithm(eventsCopy, rooms, pheromoneMap);
        lastAttempt = result;

        if (result.unscheduledEvents.length > 0) {
            nwsCount++;
            // The "Learning" Step: Increment pheromone for failed events
            for (const failedEvent of result.unscheduledEvents) {
                const key = failedEvent.SessionID || failedEvent.eventId;
                pheromoneMap.set(key, (pheromoneMap.get(key) || 0) + 1);
            }
        } else {
            // If it's a complete schedule (no unscheduled events)
            // Store this successful schedule
            successfulSchedules.push({
                schedule: result.schedule,
                softConstraintViolations: result.softConstraintViolations,
                iteration: i + 1,
                type: result.softConstraintViolations === 0 ? 'Perfect' : 'Workable'
            });

            // First, check if it's a Perfect Solution
            if (result.softConstraintViolations === 0) {
                psCount++; // Only increment the Perfect counter
            } else {
                // If it's complete but not perfect, it's a Workable Solution
                wsCount++;
            }

            // Always track the best schedule based on soft constraint violations
            if (!bestSchedule || result.softConstraintViolations < bestSchedule.softConstraintViolations) {
                bestSchedule = result; // Store the full result object for consistency
            }
        }

        // Pheromone Evaporation: Decay all pheromone levels at the end of each iteration
        for (let [key, value] of pheromoneMap.entries()) {
            pheromoneMap.set(key, value * (1 - EVAPORATION_RATE));
            if (pheromoneMap.get(key) < 0.01) {
                pheromoneMap.delete(key);
            }
        }
    }

    console.log("Analysis complete.");
    console.timeEnd('Total Iteration Time'); 
    
    return {
        nwsCount,
        wsCount,
        psCount,
        bestSchedule,
        successfulSchedules,
        totalIterations: numberOfIterations,
        lastAttempt
    };
};
