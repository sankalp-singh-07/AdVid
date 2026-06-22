import { useState } from "react";
import { Search, Briefcase, User, MapPin, Building2 } from "lucide-react";

const dummyEmployees = [
    { id: "WD-1042", name: "Sarah Jenkins", role: "Senior Software Engineer", department: "Engineering", location: "San Francisco, CA" },
    { id: "WD-1089", name: "Marcus Chen", role: "Product Manager", department: "Product", location: "New York, NY" },
    { id: "WD-2011", name: "Aisha Patel", role: "HR Business Partner", department: "Human Resources", location: "London, UK" },
    { id: "WD-3055", name: "David Kim", role: "Financial Analyst", department: "Finance", location: "Chicago, IL" },
];

export default function WorkdayExplorer() {
    const [query, setQuery] = useState("");

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Workday Integration</h1>
                <p className="text-slate-500 mt-1">Query and view structured employee and organizational data.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Natural Language Query</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input 
                                type="text"
                                placeholder='e.g., "Show me all software engineers in the Finance department"'
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 shadow-sm"
                            />
                        </div>
                    </div>
                    <button className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm shrink-0">
                        Execute Query
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="font-semibold text-slate-800">Results ({dummyEmployees.length})</h3>
                </div>
                
                <div className="overflow-x-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {dummyEmployees.map(emp => (
                            <div key={emp.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow bg-white">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg">
                                        {emp.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                                        {emp.id}
                                    </span>
                                </div>
                                <h4 className="text-lg font-bold text-slate-800">{emp.name}</h4>
                                <div className="mt-4 space-y-2.5">
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Briefcase size={16} className="text-slate-400" />
                                        <span>{emp.role}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Building2 size={16} className="text-slate-400" />
                                        <span>{emp.department}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <MapPin size={16} className="text-slate-400" />
                                        <span>{emp.location}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
