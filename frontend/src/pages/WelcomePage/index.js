import React from 'react';
import { useNavigate } from 'react-router-dom';
import './styles.css';

const WelcomePage = () => {
    const navigate = useNavigate();

    const handleStartClick = () => {
        navigate('/upload');
    };

    return (
        <div className="welcome-background">
            <div className="welcome-container">
                <div className="welcome-card">
                    <h1 className="welcome-title">MAS Timetable Generator</h1>
                    <p className="welcome-subtitle">
                        Create, analyze, and optimize school schedules with ease.
                    </p>
                    <p className="welcome-description">
                        This tool leverages a modified ant system algorithm to solve complex scheduling problems.
                    </p>
                    <button onClick={handleStartClick} className="welcome-start-button">
                        Get Started
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WelcomePage;