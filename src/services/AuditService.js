import { supabase } from '../lib/supabase';

export const AuditService = {
    /**
     * Logs an action to the audit_logs table.
     * @param {string} action - 'CREATE', 'UPDATE', 'DELETE'
     * @param {string} entityType - '5S_CARD', 'A3', etc.
     * @param {string} entityId - ID of the entity
     * @param {object} details - Any extra details (like reason for deletion, snapshot of data)
     */
    logAction: async (action, entityType, entityId, details = {}) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('audit_logs')
                .insert({
                    action,
                    entity_type: entityType,
                    entity_id: String(entityId),
                    details,
                    user_id: user?.id,
                    user_email: user?.email
                });

            if (error) {
                console.error('Error logging audit action:', error);
            }
        } catch (err) {
            console.error('Exception in AuditService.logAction:', err);
        }
    },

    /**
     * Retrieves audit logs for a specific entity type, ensuring sorting by recent first.
     * @param {string} entityType 
     * @param {number} limit 
     * @returns {Promise<Array>}
     */
    getLogs: async (entityType, limit = 50) => {
        try {
            let query = supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (entityType) {
                query = query.eq('entity_type', entityType);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Error fetching audit logs:', err);
            return [];
        }
    }
};
