import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabaseServer';
import ManagerProblemSubmissionsClient from './ManagerProblemSubmissionsClient';

export default async function ManagerProblemSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await getServerSupabase();

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) redirect('/auth/login');

    const { data: managerRow } = await supabase
      .from('managers')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!managerRow) redirect('/dashboard');

    const [
        { data: problem },
        { data: submissions }
    ] = await Promise.all([
        supabase.from('problems').select('name').eq('id', id).single(),
        supabase
            .from('submissions')
            .select('*')
            .eq('problem_id', id)
            .order('created_at', { ascending: false })
    ]);

    const problemName = problem?.name || 'Problem';
    const rawSubmissions = submissions || [];

    const userIds = Array.from(new Set(rawSubmissions.map((s: any) => s.user_id)));

    let userMap: Record<string, { username: string; email: string }> = {};
    if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, username, email')
            .in('id', userIds);

        if (!usersError && users) {
            userMap = users.reduce((acc: any, user: any) => {
                acc[user.id] = { username: user.username, email: user.email };
                return acc;
            }, {});
        }
    }

    const formattedSubmissions = rawSubmissions.map((sub: any) => {
        const userInfo = userMap[sub.user_id] || { username: 'Unknown', email: 'Unknown' };
        return {
            ...sub,
            username: userInfo.username,
            email: userInfo.email,
        };
    });

    return (
        <ManagerProblemSubmissionsClient
            initialSubmissions={formattedSubmissions}
            initialProblemName={problemName}
        />
    );
}
