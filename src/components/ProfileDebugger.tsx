import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function ProfileDebugger() {
    const { user } = useAuth();
    const [status, setStatus] = useState('Idle');
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<any>(null);
    const [listResult, setListResult] = useState<any>(null);
    const [rpcResult, setRpcResult] = useState<any>(null);

    useEffect(() => {
        if (!user) return;

        const runDebug = async () => {
            setStatus('Running...');

            // Test 1: Fetch specific profile
            const { data: singleData, error: singleError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            setResult(singleData);
            setError(singleError);

            // Test 2: List any profiles (to check table access)
            const { data: listData, error: listError } = await supabase
                .from('profiles')
                .select('id, email, role')
                .limit(3);

            setListResult({ data: listData, error: listError });

            // Test 3: RPC Call (Function)
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_role');

            // Test 4: Check if we can insert (just to see perm error) or auth user
            const { data: authUser } = await supabase.auth.getUser();

            setRpcResult({ data: rpcData, error: rpcError, authUser: authUser?.user?.id });

            setStatus('Complete');
        };

        runDebug();
    }, [user]);

    // @ts-ignore
    if (process.env.NODE_ENV === 'development') { return null; }

    return (
        <div className="fixed top-20 right-4 z-50 p-4 bg-gray-900 text-white font-mono text-xs rounded-lg shadow-xl border border-red-500 max-w-lg overflow-auto max-h-[80vh]">
            <h3 className="font-bold border-b border-red-500 mb-2 pb-1 text-red-400">Deep Debugger</h3>

            <div className="mb-2">
                <span className="text-gray-400">Status:</span> {status}
            </div>

            <div className="mb-4">
                <div className="font-bold text-blue-400">Test 1: Fetch My Profile</div>
                <div className="text-gray-400">Query: .eq('id', '{user?.id}')</div>
                <div className="mt-1">
                    <span className="text-gray-400">Data:</span>
                    <pre className="bg-black p-1 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </div>
                <div className="mt-1">
                    <span className="text-gray-400">Error:</span>
                    <pre className="bg-black p-1 rounded mt-1 text-red-400 overflow-x-auto">
                        {JSON.stringify(error, null, 2)}
                    </pre>
                </div>
            </div>

            <div className="mb-4 border-t border-gray-700 pt-2">
                <div className="font-bold text-blue-400">Test 2: List Any Profiles</div>
                <div className="text-gray-400">Query: .limit(3)</div>
                <div className="mt-1">
                    <span className="text-gray-400">Result:</span>
                    <pre className="bg-black p-1 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(listResult, null, 2)}
                    </pre>
                </div>
            </div>

            <div className="mb-4 border-t border-gray-700 pt-2">
                <div className="font-bold text-green-400">Test 3: RPC & Auth Check</div>
                <div className="text-gray-400">rpc('get_my_role')</div>
                <div className="mt-1">
                    <pre className="bg-black p-1 rounded mt-1 overflow-x-auto text-green-300">
                        {JSON.stringify(rpcResult, null, 2)}
                    </pre>
                </div>
            </div>

        </div>
    );
}
