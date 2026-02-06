import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { FaShoppingCart, FaUser, FaSignOutAlt, FaSearch } from 'react-icons/fa';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { cart } = useCart();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = React.useState('');

    const handleSearch = (e) => {
        e.preventDefault();
        navigate(`/results?q=${searchTerm}`);
    };

    return (
        <nav className="bg-blue-600 text-white p-4 shadow-md">
            <div className="container mx-auto flex justify-between items-center">
                <Link to="/" className="text-2xl font-bold">Pay4All</Link>

                <form onSubmit={handleSearch} className="flex-1 mx-4 max-w-lg flex">
                    <input
                        type="text"
                        placeholder="Search products..."
                        className="w-full p-2 rounded-l text-gray-800"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="submit" className="bg-blue-800 p-2 rounded-r hover:bg-blue-900">
                        <FaSearch />
                    </button>
                </form>

                <div className="flex items-center space-x-4">
                    {user ? (
                        <>
                            <span className="flex items-center"><FaUser className="mr-2" /> {user.first_name || user.email}</span>
                            <Link to="/cart" className="relative flex items-center">
                                <FaShoppingCart className="text-xl" />
                                {cart?.total_items > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                        {cart.total_items}
                                    </span>
                                )}
                            </Link>
                            <button onClick={logout} className="flex items-center hover:text-red-200">
                                <FaSignOutAlt />
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="hover:underline">Login</Link>
                            <Link to="/register" className="hover:underline">Register</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
