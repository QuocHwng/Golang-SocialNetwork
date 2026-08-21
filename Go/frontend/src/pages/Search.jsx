import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axiosClient from '../services/api/axiosClient';
import { UserCircle, UserPlus, UserCheck, Search as SearchIcon, Loader2 } from 'lucide-react';

const Search = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    
    const [results, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!query) {
            setLoading(false);
            return;
        }
        
        setLoading(true);
        axiosClient.get(`/users/search?q=${query}`)
            .then(res => {
                setSearchResults(res.data.data || []);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [query]);

    const AvatarDisplay = ({ url, sizeClass }) => (
        url ? <img src={url} alt="ava" className={`${sizeClass} object-cover rounded-full border border-stone-200 dark:border-stone-700 bg-white shrink-0`} /> 
            : <UserCircle className={`${sizeClass} text-stone-300 bg-white rounded-full shrink-0`} />
    );

    return (
        <div className="max-w-4xl mx-auto mt-6 px-4 pb-10">
            <div className="bg-white dark:bg-stone-800 p-6 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-700 mb-6 transition-colors">
                <h1 className="text-2xl font-black text-stone-900 dark:text-white flex items-center gap-3">
                    <SearchIcon size={28} className="text-lime-500" />
                    Kết quả tìm kiếm cho: "{query}"
                </h1>
            </div>

            {loading ? (
                <div className="flex justify-center pt-10"><Loader2 className="animate-spin text-lime-500" size={40} /></div>
            ) : results.length === 0 ? (
                <div className="bg-white dark:bg-stone-800 p-10 text-center rounded-3xl border border-stone-100 dark:border-stone-700">
                    <p className="text-stone-500 dark:text-stone-400 text-lg">Không tìm thấy người dùng nào phù hợp với từ khóa này.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {results.map(user => (
                        <Link 
                            key={user.id} 
                            to={`/profile/${user.id}`}
                            className="bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-700 flex items-center gap-4 hover:shadow-md transition-shadow group"
                        >
                            <AvatarDisplay url={user.avatar_url} sizeClass="w-16 h-16 group-hover:scale-105 transition-transform" />
                            <div className="flex-1 overflow-hidden">
                                <h3 className="font-bold text-lg text-stone-900 dark:text-white truncate">{user.full_name}</h3>
                                <p className="text-sm text-stone-500 dark:text-stone-400 truncate">@{user.username}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Search;