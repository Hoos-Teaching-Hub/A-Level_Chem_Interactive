-- Auto-generated demo seed.
-- Class code: demo-c093ea
-- Teacher code: teacher-e7b99005
-- Manual test class code: manual-test-chem
-- Manual test teacher code: manual-teacher-001
-- Manual test student code: manual-student-001
-- Student codes written to demo-codes.txt

insert into classes (class_code, name, teacher_code_hash)
values
  ('demo-c093ea', 'Demo Class', 'ccaa5c0b680757b7b9819a0aa4e448a5962b1fa399d454e18bee24f0bed2e474'),
  ('manual-test-chem', 'Manual Test Class', '84603b1e188eebe4942d0fcbdb7bd95d4f14201e9ae53c02b24a15ab65e3de5c')
on conflict (class_code) do update
  set name = excluded.name,
      teacher_code_hash = excluded.teacher_code_hash;

insert into students (id, class_code, student_code_hash, display_name)
values
  (gen_random_uuid(), 'manual-test-chem', 'f57e4aba9740a9b43b42c9c923b94f744d42fdf450e4de0b298add99e7a2d288', 'Manual Test Student'),
  (gen_random_uuid(), 'demo-c093ea', 'e40e2b9db24883d0fbe4681d7ab44d7dbd43cbc199e1d42a164c5a853a7c1e24', 'Student 1'),
  (gen_random_uuid(), 'demo-c093ea', '2b1085480648a564da3ae0306e6b3bb6cc9cf1b4571465e116ae2d6b69e50068', 'Student 2'),
  (gen_random_uuid(), 'demo-c093ea', '5c15dfa67c0f2975d2a020b60a2e52abe8a1f63c8bf5dcc2139632efb24b5a87', 'Student 3'),
  (gen_random_uuid(), 'demo-c093ea', 'a166f0ad817ee68b109711a06f12c73725a08028c38094ded0f2b87f9991c94b', 'Student 4'),
  (gen_random_uuid(), 'demo-c093ea', '0d2b7455c0778c3eedfdd4abf1df3c8b3117bcad93abc4eb13424e2f47a9f6b2', 'Student 5'),
  (gen_random_uuid(), 'demo-c093ea', 'fd9213aecf7bf5084ee36e5c5a842338705e56eb3be313d8e325c474b2adaf77', 'Student 6'),
  (gen_random_uuid(), 'demo-c093ea', '42aeb709a6989788c6c0948dcce46b21e454532aee2b609e942530fc099c77dc', 'Student 7'),
  (gen_random_uuid(), 'demo-c093ea', 'b7f8e13b93031aa03c17dcf22aabaffd39cd79bb9b9639351c22548a8f84aac7', 'Student 8'),
  (gen_random_uuid(), 'demo-c093ea', '3b37b75d0ba8bbc0764dc1b937a27a5cbcd8c5d6803197d40651c49e1c2f540e', 'Student 9'),
  (gen_random_uuid(), 'demo-c093ea', '0b59301dd624d3b11b6738f42fccdbb50826fbba242516259de2f5462f99a54e', 'Student 10')
on conflict (class_code, student_code_hash) do nothing;
