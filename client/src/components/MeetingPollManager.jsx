import React, { useState, useEffect } from 'react';
import { BarChart2, Check, X, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MeetingPollManager({ 
    socket, 
    isInstructor, 
    activePoll, 
    pollResults,
    hasVoted,
    onClose,
    onVote,
    onStartPoll,
    onEndPoll
}) {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);

    const handleAddOption = () => setOptions([...options, '']);
    const handleRemoveOption = (index) => {
        if (options.length <= 2) return;
        setOptions(options.filter((_, i) => i !== index));
    };
    
    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleStart = () => {
        if (!question.trim()) {
            toast.error('Question is required');
            return;
        }
        if (options.some(opt => !opt.trim())) {
            toast.error('All options must be filled out');
            return;
        }
        
        onStartPoll({
            id: Date.now().toString(),
            question,
            options
        });
    };

    if (isInstructor) {
        return (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[400px] bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 z-50 overflow-hidden flex flex-col max-h-[80vh]">
                <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-primary-500" />
                        {activePoll ? 'Active Poll' : 'Create Poll'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-4 flex-1 overflow-y-auto">
                    {activePoll ? (
                        <div className="space-y-4">
                            <h4 className="text-lg text-white font-medium">{activePoll.question}</h4>
                            <div className="space-y-2">
                                {activePoll.options.map((option, index) => {
                                    const votes = pollResults[index] || 0;
                                    const totalVotes = Object.values(pollResults).reduce((a, b) => a + b, 0);
                                    const percentage = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
                                    
                                    return (
                                        <div key={index} className="bg-slate-700/50 p-3 rounded-lg relative overflow-hidden">
                                            <div 
                                                className="absolute left-0 top-0 bottom-0 bg-primary-500/20 transition-all duration-500" 
                                                style={{ width: `${percentage}%` }}
                                            />
                                            <div className="relative flex justify-between text-sm text-slate-200">
                                                <span>{option}</span>
                                                <span className="font-mono">{votes} ({percentage}%)</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="pt-4 border-t border-slate-700">
                                <button
                                    onClick={onEndPoll}
                                    className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition font-medium"
                                >
                                    End Poll
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Question</label>
                                <input
                                    type="text"
                                    value={question}
                                    onChange={e => setQuestion(e.target.value)}
                                    placeholder="Enter your question..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Options</label>
                                <div className="space-y-2">
                                    {options.map((option, index) => (
                                        <div key={index} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={option}
                                                onChange={e => handleOptionChange(index, e.target.value)}
                                                placeholder={`Option ${index + 1}`}
                                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                                            />
                                            {options.length > 2 && (
                                                <button
                                                    onClick={() => handleRemoveOption(index)}
                                                    className="p-2 text-slate-400 hover:text-red-400 transition"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {options.length < 5 && (
                                    <button
                                        onClick={handleAddOption}
                                        className="mt-2 text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition"
                                    >
                                        <Plus className="w-4 h-4" /> Add Option
                                    </button>
                                )}
                            </div>
                            
                            <div className="pt-4 border-t border-slate-700">
                                <button
                                    onClick={handleStart}
                                    className="w-full py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition font-medium"
                                >
                                    Start Poll
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Student view - Modal only if there's an active poll and haven't voted
    if (!activePoll || hasVoted) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
            <div className="w-[400px] bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col">
                <div className="bg-slate-900 p-4 border-b border-slate-700">
                    <h3 className="text-white font-semibold flex items-center gap-2 text-lg">
                        <BarChart2 className="w-5 h-5 text-primary-500" />
                        Live Poll
                    </h3>
                </div>
                
                <div className="p-6 space-y-6">
                    <h4 className="text-xl text-white font-medium text-center">{activePoll.question}</h4>
                    
                    <div className="space-y-3">
                        {activePoll.options.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => onVote(index)}
                                className="w-full bg-slate-700 hover:bg-slate-600 text-white rounded-xl px-4 py-3 text-left transition flex items-center justify-between group"
                            >
                                <span>{option}</span>
                                <Check className="w-5 h-5 opacity-0 group-hover:opacity-100 text-primary-400 transition" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
