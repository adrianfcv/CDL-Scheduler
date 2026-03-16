##Product Spec Document (MVP)

Core Product Goal

Allow a manager to assign a student to an instructor without exceeding instructor capacity.

That is the single core action of the MVP.

User Stories (MoSCoW Prioritization)
MUST HAVE
1. Instructor Capacity Visibility

User Story
As a school manager, I want to see each instructor’s capacity and current student load so that I can avoid overbooking instructors.

Acceptance Criteria

                Each instructor has a defined capacity limit
                System displays number of assigned students per instructor
                Over-capacity instructors are flagged

2. Add Students to the System

User Story
As a school manager, I want to add students to the system so that they can be scheduled with instructors.

Acceptance Criteria

                Manager can create a student record
                Student record stores basic identifying information
                Student is available for assignment after creation

3. Assign Student to Instructor

User Story
As a school manager, I want to assign a student to an instructor so that training can be scheduled.

Acceptance Criteria

                Manager selects student and instructor
                System creates assignment record
                Assignment appears in instructor workload

SHOULD HAVE
4. Capacity Validation

User Story
As a school manager, I want the system to warn me if an instructor is at capacity so that I do not overload instructors.

Acceptance Criteria

                System checks instructor capacity before assignment
                Warning displayed if instructor is full
                Manager cannot exceed capacity limit

COULD HAVE
5. Unassigned Student List

User Story
As a school manager, I want to see students who have not been assigned yet so that I can schedule them quickly.

Acceptance Criteria

                System lists students with no instructor assignment
                List appears on dashboard

Functional Requirements (MVP)
The system must:

                Store instructor profiles and capacity limits
                Store student profiles
                Allow creating student records
                Allow assigning students to instructors
                Track number of students assigned per instructor
                Prevent instructor assignments exceeding capacity
                Display instructor workload clearly
                Show which students remain unassigned
                Students are assumed to be ready for scheduling when entered into the system.


Success Metrics
The MVP is successful if:

                        Scheduling admin time decreases
                        Instructor overload incidents drop to zero
                        Scheduling decisions can be made from one screen
                        Manager confidence in scaling operations increases

Primary metric:
            Weekly hours spent managing scheduling.

Out of Scope (MVP)
The MVP will not include:

                        Student readiness validation
                        Document tracking
                        Payment verification
                        CRM replacement
                        Multi-location management
                        AI scheduling optimization
                        Automated notifications
                        Instructor payroll
                        Mobile applications
                        Complex reporting

The system focuses only on:
                        Instructor capacity
                        +
                        Student assignment
                        +
                        Scheduling visibility