import { Building2, FileText, Activity, ShieldCheck } from "lucide-react";

export default function StatsSection() {
    return (
        <section className="py-16 bg-indigo-600">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
                    {/* Stat 1 */}
                    <div className="flex flex-col items-center">
                        <FileText size={32} className="text-indigo-200 mb-3" />
                        <h4 className="text-4xl font-bold tracking-tight">100K+</h4>
                        <p className="text-indigo-100 mt-1 font-medium">Documents Indexed</p>
                    </div>

                    {/* Stat 2 */}
                    <div className="flex flex-col items-center">
                        <Activity size={32} className="text-indigo-200 mb-3" />
                        <h4 className="text-4xl font-bold tracking-tight">1M+</h4>
                        <p className="text-indigo-100 mt-1 font-medium">AI Queries</p>
                    </div>

                    {/* Stat 3 */}
                    <div className="flex flex-col items-center">
                        <ShieldCheck size={32} className="text-indigo-200 mb-3" />
                        <h4 className="text-4xl font-bold tracking-tight">99.9%</h4>
                        <p className="text-indigo-100 mt-1 font-medium">Availability</p>
                    </div>

                    {/* Stat 4 */}
                    <div className="flex flex-col items-center">
                        <Building2 size={32} className="text-indigo-200 mb-3" />
                        <h4 className="text-4xl font-bold tracking-tight">Ready</h4>
                        <p className="text-indigo-100 mt-1 font-medium">Enterprise Grade</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
