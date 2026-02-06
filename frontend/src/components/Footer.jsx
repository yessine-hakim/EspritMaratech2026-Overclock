import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="bg-primary text-white pt-16 pb-8 mt-auto">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    {/* Brand Column */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Pay4All</h2>
                        <p className="text-white/60 mb-6 leading-relaxed">
                            Empowering shoppers with budget-aware insights and transparent pricing.
                        </p>
                    </div>

                    {/* Links Columns */}
                    <div>
                        <h5 className="font-bold text-lg mb-6 text-highlight">About</h5>
                        <ul className="space-y-3">
                            <li><Link to="#" className="text-white/70 hover:text-white transition-colors">About Pay4All</Link></li>
                            <li><Link to="#" className="text-white/70 hover:text-white transition-colors">How It Works</Link></li>
                            <li><Link to="#" className="text-white/70 hover:text-white transition-colors">Blog</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h5 className="font-bold text-lg mb-6 text-highlight">Support</h5>
                        <ul className="space-y-3">
                            <li><Link to="#" className="text-white/70 hover:text-white transition-colors">Help Center</Link></li>
                            <li><Link to="#" className="text-white/70 hover:text-white transition-colors">Contact Us</Link></li>
                            <li><Link to="#" className="text-white/70 hover:text-white transition-colors">FAQ</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h5 className="font-bold text-lg mb-6 text-highlight">Legal</h5>
                        <ul className="space-y-3">
                            <li><Link to="#" className="text-white/70 hover:text-white transition-colors">Privacy Policy</Link></li>
                            <li><Link to="#" className="text-white/70 hover:text-white transition-colors">Terms of Service</Link></li>
                            <li><Link to="#" className="text-white/70 hover:text-white transition-colors">Cookies</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-8 text-center text-white/40 text-sm">
                    <p>&copy; 2026 Pay4All. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
