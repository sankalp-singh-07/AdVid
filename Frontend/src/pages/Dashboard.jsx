import { FileText, MessageSquare, Users, Activity } from "lucide-react";

export default function Dashboard() {
    const stats = [
        { title: "Total Documents", value: "2,543", icon: FileText, change: "+12% this month", trend: "up" },
        { title: "AI Conversations", value: "14,092", icon: MessageSquare, change: "+24% this month", trend: "up" },
        { title: "Active Users", value: "482", icon: Users, change: "+5% this month", trend: "up" },
        { title: "System Health", value: "99.9%", icon: Activity, change: "Optimal", trend: "neutral" },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Platform Overview</h1>
                <p className="text-slate-500 mt-1">Analytics and usage statistics for your Enterprise AI.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-1">{stat.title}</p>
                                <h3 className="text-3xl font-bold text-slate-800">{stat.value}</h3>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <stat.icon size={20} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-sm">
                            <span className={stat.trend === "up" ? "text-emerald-600 font-medium" : "text-slate-500"}>
                                {stat.change}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Area (Placeholders for charts) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Query Volume Over Time</h3>
                    <div className="flex-1 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center text-slate-400">
                        [Chart Visualization Placeholder]
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Popular Topics</h3>
                    <div className="flex-1 flex flex-col gap-4">
                        {['HR Policies', 'Q1 Financials', 'Engineering Onboarding', 'Security Standards', 'Leave Application'].map((topic, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="font-medium text-slate-700">{topic}</span>
                                <span className="text-sm text-slate-500">{100 - (i * 15)} queries</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
