PGDMP  7    :        
        |            task_manager_db    16.3    16.3     �           0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                      false            �           0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                      false            �           0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                      false            �           1262    16398    task_manager_db    DATABASE     �   CREATE DATABASE task_manager_db WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'English_India.1252';
    DROP DATABASE task_manager_db;
                postgres    false            �            1259    16429    tasks    TABLE     �  CREATE TABLE public.tasks (
    id bigint NOT NULL,
    uuid character varying(256),
    title character varying(256),
    description text,
    status character varying(100),
    priority character varying(100),
    due_date date,
    created_by bigint,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    updated_by bigint
);
    DROP TABLE public.tasks;
       public         heap    postgres    false            �            1259    16428    tasks_id_seq    SEQUENCE     u   CREATE SEQUENCE public.tasks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 #   DROP SEQUENCE public.tasks_id_seq;
       public          postgres    false    218            �           0    0    tasks_id_seq    SEQUENCE OWNED BY     =   ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;
          public          postgres    false    217            �            1259    16400    users    TABLE       CREATE TABLE public.users (
    id bigint NOT NULL,
    uuid character varying(256),
    name character varying(256),
    email character varying(256),
    password character varying(256),
    is_active boolean DEFAULT true,
    role character varying(100) DEFAULT USER,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
    DROP TABLE public.users;
       public         heap    postgres    false            �            1259    16399    users_id_seq    SEQUENCE     u   CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 #   DROP SEQUENCE public.users_id_seq;
       public          postgres    false    216            �           0    0    users_id_seq    SEQUENCE OWNED BY     =   ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
          public          postgres    false    215            Z           2604    16432    tasks id    DEFAULT     d   ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);
 7   ALTER TABLE public.tasks ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    217    218    218            U           2604    16403    users id    DEFAULT     d   ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
 7   ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    216    215    216            �          0    16429    tasks 
   TABLE DATA           �   COPY public.tasks (id, uuid, title, description, status, priority, due_date, created_by, created_at, updated_at, updated_by) FROM stdin;
    public          postgres    false    218   �       �          0    16400    users 
   TABLE DATA           i   COPY public.users (id, uuid, name, email, password, is_active, role, created_at, updated_at) FROM stdin;
    public          postgres    false    216   �       �           0    0    tasks_id_seq    SEQUENCE SET     :   SELECT pg_catalog.setval('public.tasks_id_seq', 8, true);
          public          postgres    false    217            �           0    0    users_id_seq    SEQUENCE SET     :   SELECT pg_catalog.setval('public.users_id_seq', 1, true);
          public          postgres    false    215            `           2606    16440    tasks UNIQUE_TASK_TITLE 
   CONSTRAINT     U   ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT "UNIQUE_TASK_TITLE" UNIQUE (title);
 C   ALTER TABLE ONLY public.tasks DROP CONSTRAINT "UNIQUE_TASK_TITLE";
       public            postgres    false    218            b           2606    16438    tasks tasks_pkey 
   CONSTRAINT     N   ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);
 :   ALTER TABLE ONLY public.tasks DROP CONSTRAINT tasks_pkey;
       public            postgres    false    218            ^           2606    16411    users users_pkey 
   CONSTRAINT     N   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
 :   ALTER TABLE ONLY public.users DROP CONSTRAINT users_pkey;
       public            postgres    false    216            �   v  x���=k1��_�>�I��+ǝ1v\%M��4�-���zM �>[�M����[<��c��қPEW�#�dP�/X7������"3\��:������^��t��%�H-����B�������)%t���9X�P�J0��l���)A_l՜T#	�]�y�g�4w���G�\�h �l�U)t�gY����*C�=����S�m#bE�Lۀ�J����NM�����mO"1��k�(Q,r�Kv#K�-u15�Y>������v�'@-��)R���oc�.�h�[�"p�\ƞ0H��	�+Y]C)>��O�d�Y
�d�U���.�꓀R/�����Ⱦ{̪[�J����ߧQu����,cW~>���M      �   �   x�u�K�0 �u9�v�8���Ŀ1jH4���Ђb,4�����O0*��V�⪌'+,�&Be�7:g�uU��?��5�gj�����D1<9����9�#��$˶��`��.I�v���`���)�ըw��$I�vcaw�
W��bO�L��C@�!� ;���X@�X����y?��6�     