-- ================================================================
-- Migration 053: Add med_label_capture node to all specialty sequences
-- Adds the 'med_label_capture' node type to the DB constraint,
-- then inserts a Medication Label Scan node after medications
-- in every specialty sequence.
-- ================================================================

-- Step 1: Drop both possible constraint names (legacy + auto-generated)
ALTER TABLE prompt_sequence_nodes DROP CONSTRAINT IF EXISTS node_type_check;
ALTER TABLE prompt_sequence_nodes DROP CONSTRAINT IF EXISTS prompt_sequence_nodes_node_type_check;

-- Step 2: Re-create with med_label_capture included
ALTER TABLE prompt_sequence_nodes ADD CONSTRAINT node_type_check 
CHECK (node_type = ANY (ARRAY[
    'chat'::text, 'system_gate'::text, 'system_analysis'::text, 
    'system_integrity'::text, 'system_classify'::text, 
    'system_extract'::text, 'system_upload'::text, 
    'med_label_capture'::text
]));

-- Step 3: Insert med_label_capture after medications in all specialty sequences
DO $$
DECLARE
    seq RECORD;
    meds_sort INTEGER;
BEGIN
    FOR seq IN 
        SELECT DISTINCT psn.sequence_id 
        FROM prompt_sequence_nodes psn
        JOIN prompt_sequences ps ON ps.id = psn.sequence_id
        WHERE psn.step_key = 'medications'
        AND ps.sequence_type = 'specialty'
        AND NOT EXISTS (
            SELECT 1 FROM prompt_sequence_nodes 
            WHERE sequence_id = psn.sequence_id 
            AND step_key = 'med_label_capture'
        )
    LOOP
        SELECT sort_order INTO meds_sort
        FROM prompt_sequence_nodes
        WHERE sequence_id = seq.sequence_id AND step_key = 'medications'
        LIMIT 1;

        UPDATE prompt_sequence_nodes
        SET sort_order = sort_order + 5
        WHERE sequence_id = seq.sequence_id
        AND sort_order > meds_sort;

        INSERT INTO prompt_sequence_nodes (
            sequence_id, step_key, label, emoji, sort_order, 
            node_type, prompt_id, parent_node_id, pathway_condition, 
            gender_condition, specialty_condition, max_turns
        ) VALUES (
            seq.sequence_id, 'med_label_capture', 'Medication Label Scan', '💊',
            meds_sort + 2, 'med_label_capture', NULL, NULL, NULL, NULL, NULL, NULL
        );
    END LOOP;
END $$;
