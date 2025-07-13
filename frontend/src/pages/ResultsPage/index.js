// src/pages/ResultsPage/index.js

import React, { useEffect, useState, useMemo } from 'react'; // Import useMemo
import { useLocation, useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import './styles.css';

// SCHEDULING CONSTANTS
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS_PER_DAY = 13;
const BREAK_PERIOD = 5;
const FRIDAY_PRAYER_PERIOD_START = 11;

// Helper Functions for CSV Download
const generateSingleClassGrid = (className, scheduleObject) => {
    const grid = {};
    DAYS.forEach(day => {
        grid[day] = {};
        for (let i = 1; i <= PERIODS_PER_DAY; i++) {
            grid[day][`Period ${i}`] = "---";
        }
        grid[day][`Period ${BREAK_PERIOD}`] = 'BREAK';
        if (day === 'Friday') {
            for (let p = FRIDAY_PRAYER_PERIOD_START; p <= PERIODS_PER_DAY; p++) {
                grid[day][`Period ${p}`] = 'PRAYER';
            }
        }
    });
    for (const key in scheduleObject) {
        const eventInfoArray = scheduleObject[key];
        const classEvent = eventInfoArray.find(e => e.className === className || e.subjectName === 'Perhimpunan');
        if (classEvent) {
            const day = classEvent.day;
            const startPeriod = parseInt(key.split('Period')[1], 10);
            for (let d = 0; d < classEvent.duration; d++) {
                const currentPeriod = startPeriod + d;
                if (grid[day][`Period ${currentPeriod}`] === '---') {
                    grid[day][`Period ${currentPeriod}`] = `${classEvent.subjectName} (${classEvent.teacherName})`;
                }
            }
        }
    }
    return grid;
};

const formatAllClassesForCsv = (classNames, scheduleObject) => {
    let allRows = [];
    const header = ['Day', ...Array.from({ length: PERIODS_PER_DAY }, (_, i) => `Period ${i + 1}`)];
    for (const className of classNames) {
        if (className === 'Assembly') continue;
        allRows.push([`Timetable for Class: ${className}`]);
        allRows.push(header);
        const classGrid = generateSingleClassGrid(className, scheduleObject);
        Object.entries(classGrid).forEach(([day, periods]) => {
            const row = [day];
            for (let i = 1; i <= PERIODS_PER_DAY; i++) {
                row.push(periods[`Period ${i}`]);
            }
            allRows.push(row);
        });
        allRows.push([]);
    }
    return allRows;
};

const ResultsPage = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const analysisResult = location.state?.analysisResult;
    const allClassNames = location.state?.allClassNames || [];
    const algorithmUsed = location.state?.algorithmUsed || 'Unknown';

    const [selectedScheduleIndex, setSelectedScheduleIndex] = useState(0);

    const availableSchedules = useMemo(() => {
        const schedules = [];
        if (analysisResult?.successfulSchedules && analysisResult.successfulSchedules.length > 0) {
            analysisResult.successfulSchedules.forEach((sch, index) => {
                schedules.push({
                    id: `sch-${sch.iteration}-${sch.softConstraintViolations}-${index}`,
                    type: sch.type,
                    violations: sch.softConstraintViolations,
                    schedule: sch.schedule,
                    iteration: sch.iteration,
                    isBest: (analysisResult.bestSchedule && sch.schedule === analysisResult.bestSchedule.schedule)
                });
            });

            schedules.sort((a, b) => {
                if (a.violations !== b.violations) {
                    return a.violations - b.violations;
                }
                return a.iteration - b.iteration;
            });
        }
        return schedules;
    }, [analysisResult]);

    useEffect(() => {
        if (!analysisResult) {
            navigate('/upload');
        }
        if (availableSchedules.length > 0) {
            const bestIndex = availableSchedules.findIndex(sch => sch.isBest);
            setSelectedScheduleIndex(bestIndex !== -1 ? bestIndex : 0);
        } else {
            setSelectedScheduleIndex(0);
        }
    }, [analysisResult, navigate, availableSchedules]);

    if (!analysisResult) {
        return null;
    }

    const handleScheduleSelectionChange = (event) => {
        setSelectedScheduleIndex(parseInt(event.target.value, 10));
    };

    const handleDownload = () => {
        const scheduleToDownload = availableSchedules[selectedScheduleIndex];

        if (!scheduleToDownload || !scheduleToDownload.schedule) {
            alert("No schedule selected or available to download.");
            return;
        }

        const scheduleData = formatAllClassesForCsv(allClassNames, scheduleToDownload.schedule);
        const csv = Papa.unparse(scheduleData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        let filenameSuffix = '';
        if (scheduleToDownload.isBest) {
            filenameSuffix = `${scheduleToDownload.type} - Best Found (Violations ${scheduleToDownload.violations})`;
        } else {
            filenameSuffix = `${scheduleToDownload.type} - Iteration ${scheduleToDownload.iteration} (Violations ${scheduleToDownload.violations})`;
        }

        link.setAttribute('href', url);
        link.setAttribute('download', `Timetable - ${algorithmUsed} - ${filenameSuffix}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleReturn = () => {
        navigate('/upload');
    };

    return (
        <div className="results-page-container">
            <div className="results-card">
                <h2>Generation Complete!</h2>
                <h3>Analysis for: {algorithmUsed === 'MAS' ? 'Modified Ant System' : 'Simple Heuristic'}</h3>

                <div className="stats-container">
                    <div className="stat-item stat-nws">
                        <p>Non-Working Solutions: <span>{analysisResult.nwsCount}</span></p>
                    </div>
                    <div className="stat-item stat-ws">
                        <p>Workable Solutions: <span>{analysisResult.wsCount}</span></p>
                    </div>
                    {algorithmUsed === 'MAS' && (
                        <div className="stat-item stat-ps">
                            <p>Perfect Solutions: <span>{analysisResult.psCount}</span></p>
                        </div>
                    )}
                </div>

                {availableSchedules.length > 0 && (
                    <div className="timetable-selection-container">
                        <h3>Choose Timetable to Download:</h3>
                        <select
                            value={selectedScheduleIndex}
                            onChange={handleScheduleSelectionChange}
                            className="timetable-selector"
                        >
                            {availableSchedules.map((sch, index) => (
                                <option key={sch.id} value={index}>
                                    {sch.type} Solution (Soft Violations: {sch.violations})
                                    {sch.isBest ? ' (Best Found)' : ` (From Iteration ${sch.iteration})`}
                                </option>
                            ))}
                        </select>
                        <button onClick={handleDownload} className="download-button">
                            Download Selected Timetable (CSV)
                        </button>
                    </div>
                )}

                <div className="actions-container">
                    {availableSchedules.length === 0 && (
                        <p className="error-message">No successful schedule could be generated.</p>
                    )}
                    <button onClick={handleReturn} className="return-button">
                        Return
                    </button>
                </div>
            </div>

            {analysisResult.bestSchedule === null && (
                 <div className="results-card error-report">
                    <h3>Failed to Generate Schedule</h3>
                    <p>Conflicts in your data prevented a valid schedule. The following events could not be placed:</p>
                    <ul className="unscheduled-list">
                        {analysisResult.lastAttempt?.unscheduledEvents.map(event => (
                            <li key={event.eventId}>
                                <strong>{event.className} - {event.subjectName}</strong> ({event.teacherName})
                            </li>
                        ))}
                    </ul>
                    <p className="error-advice">Please check your dataset for resource conflicts.</p>
                </div>
            )}
        </div>
    );
};

export default ResultsPage;