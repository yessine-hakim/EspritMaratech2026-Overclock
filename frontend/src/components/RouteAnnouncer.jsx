import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useA11y } from '../context/A11yContext';

/**
 * RouteAnnouncer component
 * Listens for location changes and announces the page title to screen readers.
 */
const RouteAnnouncer = () => {
    const location = useLocation();
    const { announce } = useA11y();

    useEffect(() => {
        const path = location.pathname;
        let pageTitle = "Page";

        // Map paths to friendly names
        if (path === '/') pageTitle = "Home";
        else if (path === '/login') pageTitle = "Login";
        else if (path === '/register') pageTitle = "Registration";
        else if (path === '/cart') pageTitle = "Shopping Cart";
        else if (path === '/banking') pageTitle = "Banking & Wallet";
        else if (path === '/results') pageTitle = "Search Results";
        else if (path.startsWith('/product/')) pageTitle = "Product Details";

        // Announce the navigation
        announce(`Navigated to ${pageTitle} page`);

        // Also update the document title for browser accessibility
        document.title = `Pay4All | ${pageTitle}`;
    }, [location.pathname, announce]);

    return null; // This component doesn't render anything visual
};

export default RouteAnnouncer;
