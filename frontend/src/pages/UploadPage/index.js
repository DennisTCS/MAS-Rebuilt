// UploadPage/index.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Import functions from both logic files
import { processUploadedData, runAnalysisWithLearning } from '../../services/schedulingLogic';
import { runSimpleHeuristicAnalysis } from '../../services/heuristicLogic'; // Assuming this exists

import './styles.css';

const UploadPage = () => {
    const [classroomFile, setClassroomFile] = useState(null);
    const [assignmentFile, setAssignmentFile] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [iterations, setIterations] = useState(100);
    const [selectedAlgorithm, setSelectedAlgorithm] = useState('MAS');
    const navigate = useNavigate();

    const handleClassroomFileChange = (event) => setClassroomFile(event.target.files[0]);
    const handleAssignmentFileChange = (event) => setAssignmentFile(event.target.files[0]);
    const handleIterationsChange = (event) => setIterations(parseInt(event.target.value, 10));
    const handleAlgorithmChange = (event) => setSelectedAlgorithm(event.target.value);

    const handleUploadAndGenerate = async () => {
        if (!classroomFile || !assignmentFile) {
            setStatusMessage('Please select both a classroom and an assignment file.');
            return;
        }
        setIsLoading(true);
        setStatusMessage('Step 1/4: Reading files...');

        const readFileAsText = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });

        try {
            const [classroomsCsv, assignmentsCsv] = await Promise.all([
                readFileAsText(classroomFile),
                readFileAsText(assignmentFile)
            ]);

            setStatusMessage('Step 2/4: Uploading data to server...');
            // This part might need adjustment
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/data/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classroomsCsv, assignmentsCsv }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Server Error: ${errorData.message}`);
            }

            await response.json();

            setStatusMessage('Step 3/4: Processing data for scheduling...');
            const data = processUploadedData(classroomsCsv, assignmentsCsv);

            const algorithmName = selectedAlgorithm === 'MAS' ? 'Modified Ant System' : 'Simple Heuristic';
            setStatusMessage(`Step 4/4: Running ${algorithmName} analysis for ${iterations} simulations...`);

            let analysisResult;
            if (selectedAlgorithm === 'MAS') {
                analysisResult = runAnalysisWithLearning(iterations, data.eventsToSchedule, data.rooms);
            } else {
                analysisResult = runSimpleHeuristicAnalysis(iterations, data.eventsToSchedule, data.rooms);
            }

            navigate('/results', {
                state: {
                    analysisResult: {
                        ...analysisResult,
                        successfulSchedules: analysisResult.successfulSchedules || []
                    },
                    allClassNames: data.allClassNames,
                    algorithmUsed: selectedAlgorithm
                }
            });

        } catch (error) {
            console.error('Process failed:', error);
            setStatusMessage(`Error: ${error.message}`);
            setIsLoading(false);
        }
    };

    return (
        <div className="upload-page-container">
            <div className="upload-card">
                <h2>Upload & Generate Timetable</h2>
                <p>Select your data files, choose an algorithm, and click Generate.</p>
                <div className="instructions-container">
                    <div className="format-box">
                        <h3>Classrooms CSV Format</h3>
                        <ul>
                            <li><strong>RoomName</strong> (e.g., `Bilik 4A`)</li>
                            <li><strong>Type</strong> (e.g., `Standard` or `Science Lab`)</li>
                        </ul>
                        <strong>Example Table:</strong>
                        <table>
                            <thead><tr><th>RoomName</th><th>Type</th></tr></thead>
                            <tbody>
                                <tr><td>Bilik 4A</td><td>Standard</td></tr>
                                <tr><td>Makmal Sains 1</td><td>Science Lab</td></tr>
                            </tbody>
                        </table>
                        <p className="warning">Note: Column headers must match exactly.</p>
                    </div>
                    <div className="format-box">
                        <h3>Assignments CSV Format</h3>
                        <ul>
                            <li><strong>ClassName</strong> (e.g., `4 Amanah`)</li>
                            <li><strong>HomeRoom</strong> (e.g., `Bilik 4A`)</li>
                            <li><strong>SubjectName</strong> (e.g., `Physics`)</li>
                            <li><strong>TeacherName</strong> (e.g., `Cikgu Tan`)</li>
                            <li><strong>PeriodsPerWeek</strong> (e.g., `4`)</li>
                            <li><strong>DefaultBlockSize</strong> (e.g., `2`)</li>
                            <li><strong>RequiresRoomType</strong> (e.g., `Science Lab`)</li>
                            <li><strong>SessionID</strong> (e.g., `ART_3B3I_1` or blank)</li>
                        </ul>
                        <strong>Example Table:</strong>
                        <table>
                            <thead><tr><th>ClassName</th><th>HomeRoom</th><th>SubjectName</th><th>...etc</th></tr></thead>
                            <tbody>
                                <tr><td>4 Amanah</td><td>Bilik 4A</td><td>Physics</td><td>...</td></tr>
                            </tbody>
                        </table>
                        <p className="warning">Note: Column headers must match exactly.</p>
                    </div>
                </div>
                <label htmlFor="classroom-file" className="file-input-wrapper">
                    <span className="file-input-label">Choose Classrooms CSV File</span>
                    {classroomFile && <span className="file-name">✓ {classroomFile.name}</span>}
                    <input type="file" id="classroom-file" accept=".csv" onChange={handleClassroomFileChange} />
                </label>
                <label htmlFor="assignment-file" className="file-input-wrapper">
                    <span className="file-input-label">Choose Assignments CSV File</span>
                    {assignmentFile && <span className="file-name">✓ {assignmentFile.name}</span>}
                    <input type="file" id="assignment-file" accept=".csv" onChange={handleAssignmentFileChange} />
                </label>

                <div className="settings-container">
                    <div className="iterations-selector">
                        <label htmlFor="iterations">Number of Iterations:</label>
                        <select id="iterations" value={iterations} onChange={handleIterationsChange}>
                            <option value="5">5 (Quick Test)</option>
                            <option value="10">10</option>
                            <option value="50">50</option>
                            <option value="100">100 (Default)</option>
                            <option value="200">200 (Thorough)</option>
                        </select>
                    </div>
                    <div className="algorithm-selector">
                        <label htmlFor="algorithm">Algorithm:</label>
                        <select id="algorithm" value={selectedAlgorithm} onChange={handleAlgorithmChange}>
                            <option value="MAS">Modified Ant System</option>
                            <option value="Heuristic">Simple Heuristic</option>
                        </select>
                    </div>
                </div>

                <button onClick={handleUploadAndGenerate} disabled={isLoading} className="generate-button">
                    {isLoading ? statusMessage : 'Upload & Generate Timetable'}
                </button>

                {statusMessage && !isLoading && (
                    <p className={`status-message ${statusMessage.startsWith('Error') ? 'status-error' : ''}`}>
                        {statusMessage}
                    </p>
                )}
            </div>
        </div>
    );
};

export default UploadPage;