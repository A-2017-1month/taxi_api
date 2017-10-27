drop table if exists users;
create table users(
  `id` varchar(64) primary key,
  `pass` varchar(64) not null,
  `name` varchar(64),
  `gender` integer,
  `account_name` varchar(64),
  `different_ok` integer,
  `comment` varchar(64)
);

insert into users values('hoge', 'f7b94fe3cb70608f251552bd0e135d04c0949199dbd06699a1cf3308736efb35', 'hoge', 1, 'hoge', 1, '帰りたい');
insert into users values('foo', '5acc4fbcd3e2fa0a2195398df8031ba380c08c90bee2dadef66f47cc3c09a625', 'foo', 0, 'foo', 1, '帰りたい');

drop table if exists tasks;
create table tasks(
  `id` integer primary key auto_increment,
  `user_id` varchar(64) not null,
  `station_id` integer not null,
  `to_lat` float not null,
  `to_lng` float not null
);

insert into tasks values (1, 'hoge', 1, 35.1, 135.1);
insert into tasks values (2, 'foo', 1, 35.2,  135.2);
insert into tasks values (3, 'foo', 1, 35.23, 135.2);
insert into tasks values (4, 'foo', 1, 35.24, 135.2);
insert into tasks values (5, 'foo', 1, 35.25, 135.2);
insert into tasks values (6, 'foo', 1, 35.26, 135.2);
insert into tasks values (7, 'foo', 1, 35.27, 135.2);

drop table if exists `match`;
create table `match`(
  `task1_id` integer not null,
  `task2_id` integer not null,
  `task3_id` integer,
  `task4_id` integer
);

drop table if exists stations;
create table stations(
  `id` integer primary key auto_increment,
  `name` varchar(64) not null,
  `lat` float not null,
  `lng` float not null
);

insert into stations values (1, 'toarueki', 35.11, 135.11);
