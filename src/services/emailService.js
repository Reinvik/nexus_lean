import { supabase } from '../supabaseClient';

export const sendTaskReminder = async (recipientEmail, recipientName, tasks) => {
    try {
        console.log("Invoking Edge Function 'send-email'...", { recipientEmail, taskCount: tasks ? Object.keys(tasks).length : 0 });

        const { data, error } = await supabase.functions.invoke('send-email', {
            body: {
                to: recipientEmail,
                recipientName: recipientName,
                tasks: tasks
            }
        });

        if (error) {
            console.error("Function Invocation Error:", error);
            // Check if it is a specific Supabase Functions error
            if (error instanceof Error) {
                console.error("Error Message:", error.message);
                console.error("Error Stack:", error.stack);
            }
            throw new Error(`Error invocando funcion: ${error.message}`);
        }

        console.log("Email Function Response:", data);

        if (data?.error) {
            console.error("Email Provider Error:", data.error);
            return { success: false, error: data.error };
        }

        return { success: true, data };
    } catch (err) {
        console.error("Email Service Failed (Catch):", err);
        return { success: false, error: err };
    }
};
