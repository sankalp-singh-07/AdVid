import Marquee from "react-fast-marquee";
import TestimonialCard from "../components/TestimonialCard";
import { testimonialsData } from "../data/testimonialsData";
import SectionTitle from "../components/SectionTitle";

export default function Testimonials() {
    return (
        <>
            <SectionTitle text1="Testimonials" text2="Trusted by Modern Teams" text3="Thousands of enterprise leaders and teams trust our AI Knowledge Assistant to manage and query their documentation securely." />

            <Marquee className="max-w-5xl mx-auto mt-11" gradient={true} speed={25}>
                <div className="flex items-center justify-center py-5">
                    {[...testimonialsData, ...testimonialsData].map((testimonial, index) => (
                        <TestimonialCard key={index} testimonial={testimonial} />
                    ))}
                </div>
            </Marquee>
            <Marquee className="max-w-5xl mx-auto" gradient={true} speed={25} direction="right">
                <div className="flex items-center justify-center py-5">
                    {[...testimonialsData, ...testimonialsData].map((testimonial, index) => (
                        <TestimonialCard key={index} testimonial={testimonial} />
                    ))}
                </div>
            </Marquee>
        </>
    );
}